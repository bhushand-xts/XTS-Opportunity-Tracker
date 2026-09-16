import React, { Suspense, useState } from "react";
import { ApolloProvider } from "@apollo/client";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { createApolloClient } from "@xts/api-client";
import {
  AppShell,
  DashboardContent,
  LoginView,
  RegistrationPendingView,
  useAuth,
  type LoginMode,
} from "@xts/design-system";
import { ErrorBoundary } from "./ErrorBoundary";

// Lazy load MFEs dynamically via Module Federation
const AdminMFE = React.lazy(() => import("admin/App"));

const apolloClient = createApolloClient();

function LoadingFallback({ label }: { label: string }) {
  return <div className="p-5 text-center text-muted-foreground">⏳ {label}</div>;
}

function LoginGate() {
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

function AppContent() {
  const { session, profile, signOut } = useAuth();

  if (!session) {
    return <LoginGate />;
  }

  if (profile && profile.status !== "approved") {
    return <RegistrationPendingView firstName={profile.first_name} onSignOut={() => void signOut()} />;
  }

  return (
    <AppShell>
      <Suspense fallback={<LoadingFallback label="Loading module..." />}>
        <Routes>
          <Route path="/dashboard" element={<DashboardContent />} />
          <Route path="/admin/*" element={<AdminMFE />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </AppShell>
  );
}

export function App() {
  return (
    <ErrorBoundary>
      <ApolloProvider client={apolloClient}>
        <Router>
          <AppContent />
        </Router>
      </ApolloProvider>
    </ErrorBoundary>
  );
}
