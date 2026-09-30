import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { LoginGate } from "./LoginGate";
import { RegistrationPendingView } from "./RegistrationPendingView";

/**
 * Renders its children only for a signed-in, approved user; otherwise shows
 * the login screen (or the "waiting for approval" screen). Used by the app
 * shell and by every MFE that can run on its own, so the rules live in one
 * place.
 *
 * A stored session with no profile is stale — for example left behind by an
 * older version of the app. It used to leave a blank page; now it is cleared
 * and the user lands on the login screen.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { session, profile, signOut } = useAuth();
  const stale = session !== null && profile === null;

  useEffect(() => {
    if (stale) void signOut();
    // signOut is recreated on every render; only the stale flag matters here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stale]);

  if (!session || !profile) return <LoginGate />;
  if (profile.status !== "approved") {
    return <RegistrationPendingView firstName={profile.first_name} onSignOut={() => void signOut()} />;
  }
  return <>{children}</>;
}
