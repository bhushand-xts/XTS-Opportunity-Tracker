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
import { LOGIN, REGISTER, ROLE_NAME, USER_LIST_ROLES } from "./auth.queries";

// How often to notice a role reassignment made while this session is still
// open — same cadence as useSidebarMenus's own poll, so the header label and
// the sidebar go stale (and recover) together.
const ROLE_POLL_MS = 2 * 60 * 1000;

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

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  roleId: number | null;
  // Null until resolveRoleName() fills it in (or if there's no role assigned).
  roleName: string | null;
}

type AuthResult = { ok: true } | { ok: false; error: string };

const EMPTY_STATE: AuthState = { session: null, profile: null, roleId: null, roleName: null };
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

// Defends against a stored value from before roleId/roleName existed (an
// older `roles: []` shape) — anything missing just falls back to empty.
function normalizeState(raw: unknown): AuthState {
  const parsed = (raw ?? {}) as Partial<AuthState>;
  return {
    session: parsed.session ?? null,
    profile: parsed.profile ?? null,
    roleId: parsed.roleId ?? null,
    roleName: parsed.roleName ?? null,
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

// Notices a role reassignment made elsewhere (e.g. an admin using Role
// Master) while this session is still open. roleId is otherwise only ever
// set once, at login — useSidebarMenus() no longer depends on it staying
// fresh (mySidebar is resolved from the token, not a client-supplied
// roleId), but the header's displayed role name does, so this is what
// keeps that label from being stuck until the next login.
async function refreshRoleId(): Promise<void> {
  const userId = state.session?.userId;
  if (!userId) return;
  let roleId: number | null;
  try {
    const { data } = await getApolloClient().query<{
      userList: ({ id: number; roleId: number | null } | null)[] | null;
    }>({
      query: USER_LIST_ROLES,
      fetchPolicy: "network-only",
    });
    const me = data?.userList?.find((u) => u && String(u.id) === userId);
    if (!me || state.session?.userId !== userId) return;
    roleId = me.roleId ?? null;
  } catch {
    return; // transient failure — the next poll tick will retry
  }
  if (roleId === state.roleId) return; // unchanged, nothing to do
  const next: AuthState = { ...state, roleId, roleName: null };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  setState(next);
  void resolveRoleName(userId, roleId);
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key !== STORAGE_KEY) return;
    setState(event.newValue ? normalizeState(JSON.parse(event.newValue)) : EMPTY_STATE);
  });

  // On a fresh page load the stored session may still be missing its role
  // name (e.g. the previous resolveRoleName() call never finished), so
  // retry once here.
  if (state.session && state.roleId !== null && state.roleName === null) {
    void resolveRoleName(state.session.userId, state.roleId);
  }

  // Check for a role reassignment immediately on load too, not just on the
  // poll's first tick — otherwise a stale roleId cached from a previous
  // session can sit uncorrected for up to ROLE_POLL_MS after a fresh
  // reload, unlike the sidebar's own query, which always fetches fresh.
  if (state.session) {
    void refreshRoleId();
  }

  setInterval(() => {
    if (state.session) void refreshRoleId();
  }, ROLE_POLL_MS);
}

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
    roleId: snapshot.roleId,
    roleName: snapshot.roleName,
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
