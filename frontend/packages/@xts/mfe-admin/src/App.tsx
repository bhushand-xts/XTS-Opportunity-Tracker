import { ApolloProvider } from "@apollo/client";
import { BrowserRouter, Navigate, Route, Routes, useInRouterContext } from "react-router-dom";
import { getApolloClient } from "@xts/api-client";
import { AppShell, AuthGate, Toaster } from "@xts/design-system";
import { AdminOverview } from "./components/AdminOverview";
import { MenuMasterPage } from "./features/menu-management/MenuMasterPage";
import { MenuPermissionMappingPage } from "./features/menu-permission-mapping/MenuPermissionMappingPage";
import { PermissionMasterPage } from "./features/permission-management/PermissionMasterPage";
import { RoleMasterPage } from "./features/role-management/RoleMasterPage";
import { RoleMenuPermissionAssignmentPage } from "./features/role-menu-permission-assignment/RoleMenuPermissionAssignmentPage";
import { UserRoleAssignmentPage } from "./features/user-role-assignment/UserRoleAssignmentPage";

// The pages of this MFE. Their links (and the sidebar's) are absolute paths
// under /admin, so these routes are always mounted at /admin/*.
function AdminRoutes() {
  return (
    <Routes>
      <Route index element={<AdminOverview />} />
      <Route path="menu-management/menu-master" element={<MenuMasterPage />} />
      <Route path="menu-management/permission-master" element={<PermissionMasterPage />} />
      <Route path="menu-management/menu-permission-mapping" element={<MenuPermissionMappingPage />} />
      <Route path="user-management/role-master" element={<RoleMasterPage />} />
      <Route
        path="user-management/role-menu-permission-assignment"
        element={<RoleMenuPermissionAssignmentPage />}
      />
      <Route path="user-management/user-role-assignment" element={<UserRoleAssignmentPage />} />
    </Routes>
  );
}

// Two ways this MFE runs:
//  - inside the app shell, which mounts it at /admin/* and already provides the
//    router, the sidebar and the header — only the pages are rendered here;
//  - on its own (its dev server, port 3001), where nothing hosts it — so it
//    brings its own router and the same AppShell layout, with the pages at
//    /admin/* so that every link works exactly as it does in the shell.
function AuthedApp() {
  const inRouterContext = useInRouterContext();

  return (
    <>
      <Toaster />
      {inRouterContext ? (
        <AdminRoutes />
      ) : (
        <BrowserRouter>
          <AppShell>
            <Routes>
              <Route path="/admin/*" element={<AdminRoutes />} />
              <Route path="*" element={<Navigate to="/admin" replace />} />
            </Routes>
          </AppShell>
        </BrowserRouter>
      )}
    </>
  );
}

export function App() {
  return (
    <ApolloProvider client={getApolloClient()}>
      <AuthGate>
        <AuthedApp />
      </AuthGate>
    </ApolloProvider>
  );
}

export default App;
