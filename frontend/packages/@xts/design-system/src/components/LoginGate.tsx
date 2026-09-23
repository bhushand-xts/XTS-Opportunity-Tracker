import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { LoginView, type LoginMode } from "./LoginView";

/**
 * The sign-in / sign-up screen wired to the auth store. Shared by the app
 * shell and by each MFE that can run standalone, so the form state and the
 * submit logic live in one place.
 */
export function LoginGate() {
  const { signIn, signUp, signInWithSso } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [mode, setMode] = useState<LoginMode>("signin");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

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
      onEmailChange={setEmail}
      onPasswordChange={setPassword}
      onFirstNameChange={setFirstName}
      onLastNameChange={setLastName}
      onConfirmPasswordChange={setConfirmPassword}
      onModeChange={setMode}
      onSso={signInWithSso}
      onSubmit={async (event) => {
        event.preventDefault();
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
