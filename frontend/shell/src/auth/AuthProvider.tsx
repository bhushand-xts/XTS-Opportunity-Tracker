// OIDC SSO completes with the identity provider before the client loads
// (per the API design section) -- this is a stand-in for that handshake.
// Swap the body of `signIn`/`getToken` for the real OIDC client library
// once the identity provider is chosen; the useSession() contract below
// is what the rest of the shell and every MFE's permission check depend on.

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Role } from "@xts/platform";

interface Session {
  isLoading: boolean;
  token: string | null;
  role: Role | null;
}

const SessionContext = createContext<Session>({ isLoading: true, token: null, role: null });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session>({ isLoading: true, token: null, role: null });

  useEffect(() => {
    // TODO: replace with the real OIDC redirect/callback flow.
    setSession({ isLoading: false, token: null, role: null });
  }, []);

  return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>;
}

export function useSession() {
  return useContext(SessionContext);
}

export function getToken(): string | null {
  return null; // replaced by the real token store once OIDC is wired in
}
