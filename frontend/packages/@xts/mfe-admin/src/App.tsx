import { useState } from "react";
import { ApolloProvider } from "@apollo/client";
import { BrowserRouter, Route, Routes, useInRouterContext } from "react-router-dom";
import { createApolloClient } from "@xts/api-client";
import { LoginView, RegistrationPendingView, Toaster, useAuth, type LoginMode } from "@xts/design-system";
import { AdminOverview } from "./components/AdminOverview";
import { PlaceholderPage } from "./components/PlaceholderPage";
import { MenuMasterPage } from "./features/menu-management/MenuMasterPage";
import { PermissionMasterPage } from "./features/permission-management/PermissionMasterPage";
import { RoleMasterPage } from "./features/role-management/RoleMasterPage";
import { RoleMenuPermissionAssignmentPage } from "./features/role-menu-permission-assignment/RoleMenuPermissionAssignmentPage";
// Registers mock GraphQL resolvers as a side effect — see @xts/api-client's
// createApolloClient(). Delete these imports once the real backend is live.
import "./features/menu-management/menu.mocks";
import "./features/permission-management/permission.mocks";
import "./features/role-management/role.mocks";
import "./features/role-menu-permission-assignment/roleMenuPermission.mocks";

const apolloClient = createApolloClient();

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

// Navigation to these routes lives in AppShell's sidebar now (a single
// shared nav surface for the whole app), not in a layout here — this MFE
// only owns the page content for each route.
function AdminRoutes() {
  return (
    <Routes>
      <Route index element={<AdminOverview />} />
      <Route path="menu-management/menu-master" element={<MenuMasterPage />} />
      <Route path="menu-management/permission-master" element={<PermissionMasterPage />} />
      <Route path="user-management/role-master" element={<RoleMasterPage />} />
      <Route
        path="user-management/role-menu-permission-assignment"
        element={<RoleMenuPermissionAssignmentPage />}
      />
      <Route
        path="user-management/user-role-assignment"
        element={<PlaceholderPage title="User Role Assignment" />}
      />
    </Routes>
  );
}

// mfe-admin is mounted by app-shell at /admin/* (inside app-shell's own
// <BrowserRouter>, so router context is already present), but also runs
// standalone on its own dev server with no host router at all. Self-wrap
// only when not already inside one.
function AuthedApp() {
  const inRouterContext = useInRouterContext();
  const routes = <AdminRoutes />;

  return (
    <>
      <Toaster />
      {inRouterContext ? routes : <BrowserRouter>{routes}</BrowserRouter>}
    </>
  );
}

function AppContent() {
  const { session, profile, signOut } = useAuth();

  if (!session) return <LoginGate />;
  if (profile && profile.status !== "approved") {
    return <RegistrationPendingView firstName={profile.first_name} onSignOut={() => void signOut()} />;
  }
  return <AuthedApp />;
}

export function App() {
  return (
    <ApolloProvider client={apolloClient}>
      <AppContent />
    </ApolloProvider>
  );
}

export default App;
