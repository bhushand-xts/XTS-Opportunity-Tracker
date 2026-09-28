import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { LoginView, type LoginMode } from "./LoginView";

/**
 * The sign-in / sign-up / forgot-password / reset-password screen wired to
 * the auth store. Shared by the app shell and by each MFE that can run
 * standalone, so the form state and the submit logic live in one place.
 *
 * A password-reset link (?token=...) works from here regardless of path:
 * AuthGate shows this component for any URL while signed out, so reading the
 * token straight from the query string (rather than a dedicated route) is
 * enough to land the visitor on the reset-password screen.
 */
export function LoginGate() {
  const { signIn, signUp, signInWithSso, requestPasswordReset, resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [mode, setMode] = useState<LoginMode>("signin");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [resetToken, setResetToken] = useState<string>();
  const [resetEmailSent, setResetEmailSent] = useState(false);

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token");
    if (token) {
      setResetToken(token);
      setMode("reset");
    }
  }, []);

  const changeMode = (next: LoginMode) => {
    setError(undefined);
    setResetEmailSent(false);
    setPassword("");
    setConfirmPassword("");
    setMode(next);
  };

  return (
    <LoginView
      email={email}
      password={password}
      firstName={firstName}
      lastName={lastName}
      confirmPassword={confirmPassword}
      busy={busy}
      mode={mode}
      error={error}
      resetEmailSent={resetEmailSent}
      onEmailChange={setEmail}
      onPasswordChange={setPassword}
      onFirstNameChange={setFirstName}
      onLastNameChange={setLastName}
      onConfirmPasswordChange={setConfirmPassword}
      onModeChange={changeMode}
      onSso={signInWithSso}
      onSubmit={async (event) => {
        event.preventDefault();

        if (mode === "forgot") {
          setBusy(true);
          const result = await requestPasswordReset(email);
          setBusy(false);
          if (!result.ok) {
            setError(result.error);
            return;
          }
          setError(undefined);
          setResetEmailSent(true);
          return;
        }

        if (mode === "reset") {
          if (!resetToken) {
            setError("This reset link is invalid or has expired.");
            return;
          }
          setBusy(true);
          const result = await resetPassword(resetToken, password, confirmPassword);
          setBusy(false);
          if (!result.ok) {
            setError(result.error);
            return;
          }
          // Send them to a clean sign-in screen with the new password ready to use.
          window.location.href = window.location.pathname;
          return;
        }

        if (mode === "signup" && password !== confirmPassword) {
          setError("Passwords do not match");
          return;
        }
        setBusy(true);
        const result =
          mode === "signin" ? await signIn(email, password) : await signUp(firstName, lastName, email, password);
        setBusy(false);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setError(undefined);
      }}
    />
  );
}
