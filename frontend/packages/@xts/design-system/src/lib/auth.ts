/**
 * Auth store — session/profile/roles live here (useSyncExternalStore,
 * genuinely shared cross-MFE since @xts/design-system is a Module
 * Federation singleton), while credential checks go through GraphQL:
 * signIn/signUp call the Login/RegisterUser mutations (auth.queries.ts)
 * against the mock resolver in auth.mocks.ts today, and against a real
 * backend once USE_MOCK_GRAPHQL flips in @xts/api-client — nothing here
 * needs to change for that cutover.
 *
 * signInWithSso() stays a local fabrication (SSO is out of scope for this
 * work) but writes through the same persisted-state shape as everything
 * else, so there's only one storage format to reason about.
 */
import "./auth.mocks";
import { useMutation } from "@apollo/client";
import { useSyncExternalStore } from "react";
import type { AuthPayload } from "@xts/api-contracts";
import type { Role } from "./mock-data";
import { LOGIN, REGISTER } from "./auth.queries";

export type AppPermission = "dashboard" | "admin" | "opportunity" | "solution" | "approval";

export const ROLE_LABEL: Record<Role, string> = {
  "Sales Rep": "Sales Representative",
  "Sales Manager": "Sales Manager",
  "Sales Head": "Sales Head",
  "System Admin": "System Administrator",
};

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
  roles: Role[];
}

type AuthResult = { ok: true } | { ok: false; error: string };

const EMPTY_STATE: AuthState = { session: null, profile: null, roles: [] };
const STORAGE_KEY = "authState";

function stateFromPayload({ user, token }: AuthPayload): AuthState {
  return {
    session: { userId: user.id, email: user.email, token },
    // The real backend's User type has no status/roles yet (mst_user has
    // is_active: boolean and a single role_id, not this richer shape) — the
    // GraphQL query no longer requests them (see auth.queries.ts), so they
    // can't be read off `user` here without silently going undefined at
    // runtime despite AuthUser's type claiming they're always present.
    // Synthesize safe defaults until the backend exposes the real values:
    // status always passes the approval gate, roles stays empty (no
    // role-based behavior yet).
    profile: {
      first_name: user.firstName,
      last_name: user.lastName,
      status: "approved",
    },
    roles: [],
  };
}

function readStoredState(): AuthState {
  if (typeof window === "undefined") return EMPTY_STATE;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return EMPTY_STATE;
  try {
    return JSON.parse(raw) as AuthState;
  } catch {
    return EMPTY_STATE;
  }
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
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key !== STORAGE_KEY) return;
    setState(event.newValue ? (JSON.parse(event.newValue) as AuthState) : EMPTY_STATE);
  });
}

const ALL_PERMISSIONS: AppPermission[] = ["dashboard", "admin", "opportunity", "solution", "approval"];

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
    roles: snapshot.roles,
    can(permission: AppPermission) {
      return ALL_PERMISSIONS.includes(permission);
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
        roles: ["System Admin"],
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
