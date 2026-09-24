import type { ReactNode } from "react";
import { ApolloProvider } from "@apollo/client";
import { BrowserRouter, Navigate, Route, Routes, useInRouterContext } from "react-router-dom";
import { getApolloClient } from "@xts/api-client";
import { AppShell, AuthGate, Spinner, Toaster, useSidebarMenus } from "@xts/design-system";
import { AdminOverview } from "./components/AdminOverview";
import { MenuMasterPage } from "./features/menu-management/MenuMasterPage";
import { MenuPermissionMappingPage } from "./features/menu-permission-mapping/MenuPermissionMappingPage";
import { PermissionMasterPage } from "./features/permission-management/PermissionMasterPage";
import { RoleMasterPage } from "./features/role-management/RoleMasterPage";
import { RoleMenuPermissionAssignmentPage } from "./features/role-menu-permission-assignment/RoleMenuPermissionAssignmentPage";
import { UserRoleAssignmentPage } from "./features/user-role-assignment/UserRoleAssignmentPage";

// Guards a single page by menu access (AC8): the sidebar already only links
// to what a role can see, but that's not an authorization mechanism — this
// is what actually stops a direct URL visit. `menuKey` must match the
// menuKey configured for that page in Menu Master (see @xts/design-system's
// menuRoutes.ts, the single map from a menuKey to the route it opens).
// Renders nothing but a spinner while access data is still loading, so a
// legitimate visit never flashes a redirect before the query resolves.
function Protected({ menuKey, children }: { menuKey: string; children: ReactNode }) {
  const { isMenuKeyAccessible, loading } = useSidebarMenus();
  if (loading) {
    return (
      <div className="flex items-center justify-center p-10">
        <Spinner className="size-5" />
      </div>
    );
  }
  if (!isMenuKeyAccessible(menuKey)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

// The pages of this MFE. Their links (and the sidebar's) are absolute paths
// under /admin, so these routes are always mounted at /admin/*.
function AdminRoutes() {
  return (
    <Routes>
      <Route index element={<AdminOverview />} />
      <Route
        path="menu-management/menu-master"
        element={
          <Protected menuKey="menu_master">
            <MenuMasterPage />
          </Protected>
        }
      />
      <Route
        path="menu-management/permission-master"
        element={
          <Protected menuKey="permission_master">
            <PermissionMasterPage />
          </Protected>
        }
      />
      <Route
        path="menu-management/menu-permission-mapping"
        element={
          <Protected menuKey="menu_permission_mapping">
            <MenuPermissionMappingPage />
          </Protected>
        }
      />
      <Route
        path="user-management/role-master"
        element={
          <Protected menuKey="role_master">
            <RoleMasterPage />
          </Protected>
        }
      />
      <Route
        path="user-management/role-menu-permission-assignment"
        element={
          <Protected menuKey="role_menu_permission_assignment">
            <RoleMenuPermissionAssignmentPage />
          </Protected>
        }
      />
      <Route
        path="user-management/user-role-assignment"
        element={
          <Protected menuKey="user_role_assignment">
            <UserRoleAssignmentPage />
          </Protected>
        }
      />
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
