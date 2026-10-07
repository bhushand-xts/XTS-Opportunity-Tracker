import { ApolloProvider } from "@apollo/client";
import { BrowserRouter, Navigate, Route, Routes, useInRouterContext } from "react-router-dom";
import { getApolloClient } from "@xts/api-client";
import { AppShell, AuthGate, Toaster } from "@xts/design-system";
import { AdminOverview } from "./components/AdminOverview";
import { EstimatePhaseMasterPage } from "./features/estimate-phase-management/EstimatePhaseMasterPage";
import { MenuMasterPage } from "./features/menu-management/MenuMasterPage";
import { MenuPermissionMappingPage } from "./features/menu-permission-mapping/MenuPermissionMappingPage";
import { PermissionMasterPage } from "./features/permission-management/PermissionMasterPage";
import { RfpQuestionMasterPage } from "./features/rfp-question-management/RfpQuestionMasterPage";
import { RoleMasterPage } from "./features/role-management/RoleMasterPage";
import { RoleMenuPermissionAssignmentPage } from "./features/role-menu-permission-assignment/RoleMenuPermissionAssignmentPage";
import { UserRoleAssignmentPage } from "./features/user-role-assignment/UserRoleAssignmentPage";
import { CurrencyMasterPage } from "./features/currency-management/CurrencyMasterPage";
import { RateMasterPage } from "./features/rate-master-management/RateMasterPage";
import { ReasonCodeMasterPage } from "./features/reason-code-management/ReasonCodeMasterPage";
import { AccountTypeMasterPage } from "./features/account-type-management/AccountTypeMasterPage";
import { IndustryMasterPage } from "./features/industry-management/IndustryMasterPage";
import { StageMasterPage } from "./features/stage-management/StageMasterPage";
import { SubStageMasterPage } from "./features/sub-stage-management/SubStageMasterPage";

// The pages of this MFE. Their links (and the sidebar's) are absolute paths
// under /admin, so these routes are always mounted at /admin/*.
function AdminRoutes() {
  return (
    <Routes>
      <Route index element={<AdminOverview />} />
      <Route path="estimate-management/estimate-phase-master" element={<EstimatePhaseMasterPage />} />
      <Route path="estimate-management/currency-master" element={<CurrencyMasterPage />}/>
      <Route path="estimate-management/rate-master" element={<RateMasterPage />}/>
      <Route path="estimate-management/reason-code-master" element={<ReasonCodeMasterPage />}/>
      <Route path="estimate-management/account-type-master" element={<AccountTypeMasterPage />}/>
      <Route path="estimate-management/industry-master" element={<IndustryMasterPage />}/>
      <Route path="stage-management/stage-master" element={<StageMasterPage />}/>
      <Route path="stage-management/sub-stage-master" element={<SubStageMasterPage />}/>
      <Route path="menu-management/menu-master" element={<MenuMasterPage />} />
      <Route path="menu-management/permission-master" element={<PermissionMasterPage />} />
      <Route path="menu-management/menu-permission-mapping" element={<MenuPermissionMappingPage />} />
      <Route path="rfp-management/generic-rfp-question-master" element={<RfpQuestionMasterPage />} />
      <Route path="user-management/role-master" element={<RoleMasterPage />} />
      <Route
        path="user-management/role-menu-permission-assignment"
        element={<RoleMenuPermissionAssignmentPage />}
      />
      <Route path="user-management/user-role-assignment" element={<UserRoleAssignmentPage />} />
      <Route path="rfp-management/generic-rfp-question-master" element={<RfpQuestionMasterPage />} />
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
