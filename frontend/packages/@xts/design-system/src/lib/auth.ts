/**
 * Auth store — session/profile/role live here (useSyncExternalStore,
 * genuinely shared cross-MFE since @xts/design-system is a Module
 * Federation singleton), while credential checks go through GraphQL:
 * signIn/signUp call the `login` / `register` mutations of the user service
 * (auth.queries.ts) through the gateway.
 *
 * The signed-in user's role name isn't part of the login/register response —
 * mst_user only carries a role_id, and the role itself (mst_roles) lives in
 * the admin service. After persisting the session, resolveRoleName() makes a
 * follow-up ROLE_NAME query through the same gateway (Apollo Federation
 * routes it to the admin subgraph) and patches roleName into the stored
 * state once it resolves.
 *
 * signInWithSso() stays a local fabrication (SSO is out of scope for this
 * work) but writes through the same persisted-state shape as everything
 * else, so there's only one storage format to reason about.
 */
import { useMutation } from "@apollo/client";
import { useSyncExternalStore } from "react";
import { getApolloClient } from "@xts/api-client";
import type { AuthPayload } from "@xts/api-contracts";
import { LOGIN, REGISTER, ROLE_ACCESS, ROLE_NAME } from "./auth.queries";

export type AppPermission = "dashboard" | "admin" | "opportunity" | "solution" | "approval";

interface Profile {
  first_name: string;
  last_name: string;
  status: "pending" | "approved" | "rejected";
}

interface Session {
  userId: string;
  email: string;
  token: string;
}

// Serializable form of Map<menuKey, Set<permissionKey>> (JSON can't hold Maps/Sets
// directly, and this goes straight into localStorage) — every permission the
// signed-in user's role holds, grouped by the menu it's on.
type AccessMap = Record<string, string[]>;

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  roleId: number | null;
  // Null until resolveRoleName() fills it in (or if there's no role assigned).
  roleName: string | null;
  // Empty until resolveAccess() fills it in.
  access: AccessMap;
}

type AuthResult = { ok: true } | { ok: false; error: string };

const EMPTY_STATE: AuthState = { session: null, profile: null, roleId: null, roleName: null, access: {} };
const STORAGE_KEY = "authState";

function stateFromPayload({ user, token }: AuthPayload): AuthState {
  return {
    session: { userId: String(user.id), email: user.email, token },
    // The backend's User type has no status concept yet (mst_user has
    // is_active: boolean, not this richer shape), so it's not requested (see
    // auth.queries.ts). Synthesize a safe default: status always passes the
    // approval gate.
    profile: {
      first_name: user.firstName ?? "",
      last_name: user.lastName ?? "",
      status: "approved",
    },
    roleId: user.roleId ?? null,
    roleName: null,
    access: {},
  };
}

function readStoredState(): AuthState {
  if (typeof window === "undefined") return EMPTY_STATE;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return EMPTY_STATE;
  try {
    return normalizeState(JSON.parse(raw));
  } catch {
    return EMPTY_STATE;
  }
}

// Defends against a stored value from before roleId/roleName/access existed
// (an older `roles: []` shape) — anything missing just falls back to empty.
function normalizeState(raw: unknown): AuthState {
  const parsed = (raw ?? {}) as Partial<AuthState>;
  return {
    session: parsed.session ?? null,
    profile: parsed.profile ?? null,
    roleId: parsed.roleId ?? null,
    roleName: parsed.roleName ?? null,
    access: parsed.access ?? {},
  };
}

let state: AuthState = readStoredState();

const listeners = new Set<() => void>();
function setState(next: AuthState) {
  state = next;
  listeners.forEach((listener) => listener());
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
function getSnapshot() {
  return state;
}

function persistSession(payload: AuthPayload) {
  const next = stateFromPayload(payload);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  setState(next);
  void resolveRoleName(next.session!.userId, next.roleId);
  void resolveAccess(next.session!.userId, next.roleId);
}

// Fetches the role name for roleId from the admin subgraph and patches it
// into the stored state, but only if this is still the signed-in user's
// session (a slow response shouldn't clobber a sign-out or a later sign-in).
async function resolveRoleName(userId: string, roleId: number | null): Promise<void> {
  if (roleId === null) return;
  let roleName: string | null = null;
  try {
    const { data } = await getApolloClient().query<{ role: { roleName: string } | null }>({
      query: ROLE_NAME,
      variables: { id: roleId },
      fetchPolicy: "network-only",
    });
    roleName = data?.role?.roleName ?? null;
  } catch {
    return;
  }
  if (!roleName || state.session?.userId !== userId) return;
  const next: AuthState = { ...state, roleName };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  setState(next);
}

// Fetches every (menu, permission) grant the role holds and patches it into
// the stored state, same guard as resolveRoleName. Drives hasPermission() /
// hasMenuAccess() below.
async function resolveAccess(userId: string, roleId: number | null): Promise<void> {
  if (roleId === null) return;
  let access: AccessMap = {};
  try {
    const { data } = await getApolloClient().query<{ roleAccess: { menuKey: string; permissionKey: string }[] }>({
      query: ROLE_ACCESS,
      variables: { roleId },
      fetchPolicy: "network-only",
    });
    for (const grant of data?.roleAccess ?? []) {
      (access[grant.menuKey] ??= []).push(grant.permissionKey);
    }
  } catch {
    return;
  }
  if (state.session?.userId !== userId) return;
  const next: AuthState = { ...state, access };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  setState(next);
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key !== STORAGE_KEY) return;
    setState(event.newValue ? normalizeState(JSON.parse(event.newValue)) : EMPTY_STATE);
  });

  // On a fresh page load the stored session may still be missing its role
  // name or access (e.g. the previous resolve*() call never finished), so
  // retry once here.
  if (state.session && state.roleId !== null && state.roleName === null) {
    void resolveRoleName(state.session.userId, state.roleId);
  }
  if (state.session && state.roleId !== null && Object.keys(state.access).length === 0) {
    void resolveAccess(state.session.userId, state.roleId);
  }

  // Silently refresh the signed-in user's access data in the background, so a
  // permission change (Role Menu Permission Assignment, Menu Permission
  // Mapping) takes effect without requiring a full sign-out/sign-in. The
  // previous access map keeps serving hasPermission()/hasMenuAccess()
  // synchronously until this resolves, so there's no flicker — just fresher
  // data a moment after each refresh. No-ops while signed out.
  const ACCESS_REFRESH_INTERVAL_MS = 30_000;
  setInterval(() => {
    if (state.session && state.roleId !== null) {
      void resolveAccess(state.session.userId, state.roleId);
    }
  }, ACCESS_REFRESH_INTERVAL_MS);
}

const ALL_PERMISSIONS: AppPermission[] = ["dashboard", "admin", "opportunity", "solution", "approval"];

/**
 * The signed-in user's database id, as the positive integer the backend
 * expects for `createdBy` / `updatedBy`. Returns null when nobody is signed
 * in, or for the demo SSO identity (which has no row in mst_user).
 */
export function getCurrentUserId(): number | null {
  const id = Number(state.session?.userId);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function messageFrom(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}

/**
 * Does the signed-in user's role hold this specific permission on this menu?
 * Keyed by menuKey/permissionKey (stable, human-chosen strings), never by the
 * numeric ids — see mst_menus.menu_key / mst_permissions.permission_key.
 */
export function hasPermission(menuKey: string, permissionKey: string): boolean {
  return state.access[menuKey]?.includes(permissionKey) ?? false;
}

/** Does the role hold ANY permission on this menu? — enough to decide whether
 * to show a nav link for it at all. */
export function hasMenuAccess(menuKey: string): boolean {
  return (state.access[menuKey]?.length ?? 0) > 0;
}

export function useAuth() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, () => EMPTY_STATE);
  const [loginMutation] = useMutation<{ login: AuthPayload }, { email: string; password: string }>(LOGIN);
  const [registerMutation] = useMutation<
    { register: AuthPayload },
    { firstName: string; lastName: string; email: string; password: string }
  >(REGISTER);

  return {
    loading: false,
    session: snapshot.session,
    profile: snapshot.profile,
    roleName: snapshot.roleName,
    can(permission: AppPermission) {
      return ALL_PERMISSIONS.includes(permission);
    },
    // Reactive versions of hasPermission()/hasMenuAccess(), reading from this
    // hook's subscribed snapshot so a component re-renders once access data
    // resolves (it arrives asynchronously, after sign-in).
    hasPermission(menuKey: string, permissionKey: string) {
      return snapshot.access[menuKey]?.includes(permissionKey) ?? false;
    },
    hasMenuAccess(menuKey: string) {
      return (snapshot.access[menuKey]?.length ?? 0) > 0;
    },
    async signIn(email: string, password: string): Promise<AuthResult> {
      if (!email.trim() || !password.trim()) {
        return { ok: false, error: "Please fill in all fields" };
      }
      if (!email.includes("@")) {
        return { ok: false, error: "Please enter a valid email" };
      }
      try {
        const { data } = await loginMutation({ variables: { email: email.trim(), password } });
        if (!data) throw new Error("No response from server.");
        persistSession(data.login);
        return { ok: true };
      } catch (error) {
        return { ok: false, error: messageFrom(error) };
      }
    },
    async signUp(firstName: string, lastName: string, email: string, password: string): Promise<AuthResult> {
      if (!firstName.trim() || !lastName.trim() || !email.trim() || !password.trim()) {
        return { ok: false, error: "Please fill in all fields" };
      }
      if (!email.includes("@")) {
        return { ok: false, error: "Please enter a valid email" };
      }
      try {
        const { data } = await registerMutation({
          variables: { firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim(), password },
        });
        if (!data) throw new Error("No response from server.");
        persistSession(data.register);
        return { ok: true };
      } catch (error) {
        return { ok: false, error: messageFrom(error) };
      }
    },
    // Demo stand-in for a real SSO redirect/callback — signs straight in as
    // a fixed corporate identity, bypassing GraphQL entirely. Swap for a
    // real OIDC/SAML flow before shipping.
    signInWithSso() {
      const next: AuthState = {
        session: { userId: "sso-demo", email: "bdixit@xtsworld.in", token: "demo-sso-token" },
        profile: { first_name: "B", last_name: "Dixit", status: "approved" },
        roleId: null,
        roleName: "System Administrator",
        access: {},
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setState(next);
    },
    async signOut() {
      window.localStorage.removeItem(STORAGE_KEY);
      setState(EMPTY_STATE);
    },
  };
}
