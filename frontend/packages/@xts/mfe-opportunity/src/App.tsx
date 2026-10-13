import { ApolloProvider } from "@apollo/client";
import { lazy, Suspense, useCallback, useMemo, type ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes, useInRouterContext } from "react-router-dom";
import { getApolloClient } from "@xts/api-client";
import type { RfpQuestion } from "@xts/api-contracts";
import { AppShell, AuthGate, OpportunityRouteAlias, Toaster, resolveOpportunityMenus, useAuth, type OpportunityMenuRecord } from "@xts/design-system";
import { PipelinePage } from "./components/PipelinePage";
import { OpportunityFormPage } from "./components/OpportunityFormPage";
import { OpportunityDetailsPage } from "./components/OpportunityDetailsPage";
import { OpportunityAccessProvider } from "./hooks/useOpportunityAccess";
import { UnsavedProvider } from "./hooks/useUnsaved";
import { useResource } from "./hooks/useResource";
import { OpportunityServiceContext } from "./services/OpportunityService";
import { createWorkflowService } from "./services/proposed/createWorkflowService";
import { GET_LOCAL_WORKFLOW_DIRECTORY, GET_LOCAL_WORKFLOW_ROLE_ACCESS, type OwnerDirectoryData, type OwnerDirectoryRole } from "./services/userDirectory.queries";
import { mapOwnerDirectory } from "./services/useOwnerDirectory";
import type { LocalWorkflowDirectory } from "./testing/fixtures";
import { Loading, Notice } from "./components/ui";
import "./opportunity.css";

const USE_LOCAL_WORKFLOW = process.env.NODE_ENV !== "production" && process.env.OPPORTUNITY_USE_LOCAL_WORKFLOW === "true";
interface LocalDirectoryData extends OwnerDirectoryData { currentUserId: number | null; menus: OpportunityMenuRecord[]; rfpQuestionsList: RfpQuestion[]; }

// Real login, menus and masters stay connected. Only unfinished workflow persistence
// uses browser storage in this explicit development mode. No identity override exists.
const LocalEnvironment = USE_LOCAL_WORKFLOW ? lazy(() => import("./testing/fixtures").then(fixtures => ({
  default: function LocalEnvironmentProvider({ children }: { children: ReactNode }) {
    const { session } = useAuth();
    const actorId = session?.userId, token = session?.token;
    const load = useCallback(async () => {
      const client = getApolloClient(), api = createWorkflowService(client);
      let cached: LocalWorkflowDirectory | undefined, cachedAt = 0;
      async function loadDirectory(fresh: boolean): Promise<LocalWorkflowDirectory> {
        if (!fresh && cached && Date.now() - cachedAt < 5_000) return cached;
        const [{ data }, lookups] = await Promise.all([
          client.query<LocalDirectoryData>({ query: GET_LOCAL_WORKFLOW_DIRECTORY, fetchPolicy: "network-only", errorPolicy: "none" }), api.lookups(),
        ]);
        if (!data.currentUserId || String(data.currentUserId) !== actorId) throw new Error("Sign in with a registered user to test Opportunities.");
        if (!Array.isArray(data.userList) || !Array.isArray(data.rolesList) || !Array.isArray(data.rfpQuestionsList)) throw new Error("The user and role directory response was incomplete.");
        const roles = data.rolesList.filter((role): role is OwnerDirectoryRole => role?.isActive === true);
        const roleByUser = new Map(data.userList.filter(user => user !== null).map(user => [String(user.id), user.roleId]));
        const users = mapOwnerDirectory(data).map(user => ({ ...user, active: user.active && roles.some(role => role.id === roleByUser.get(user.id)) }));
        const menus = resolveOpportunityMenus(data.menus), keys = new Set(menus.map(menu => menu.menuKey));
        const access = await Promise.all(roles.map(async role => {
          const result = await client.query<{ roleAccess: { menuKey: string; permissionKey: string }[] }>({ query: GET_LOCAL_WORKFLOW_ROLE_ACCESS, variables: { roleId: role.id }, fetchPolicy: "network-only", errorPolicy: "none" });
          return [role.id, result.data.roleAccess.filter(grant => keys.has(grant.menuKey)).map(grant => grant.permissionKey)] as const;
        }));
        const byRole = new Map(access);
        const permissions = Object.fromEntries(users.map(user => [user.id, byRole.get(roleByUser.get(user.id) ?? -1) ?? []]));
        const group = (kind: "SALES" | "CEO") => users.filter(user => {
          const role = roles.find(role => role.id === roleByUser.get(user.id));
          const code = role?.roleCode?.trim().toLowerCase(), name = role?.roleName.trim() ?? "";
          const matches = kind === "SALES" ? code === "sh" || code === "sales_head" || /^sales head$/i.test(name) : code === "ceo" || /^ceo(?:\b|\/)|chief executive/i.test(name);
          return matches && user.active && permissions[user.id].includes("view") && (permissions[user.id].includes("approve") || permissions[user.id].includes("reject"));
        }).map(user => user.id);
        if (!users.some(user => user.id === actorId && user.active) || !permissions[actorId!]?.includes("view")) throw new Error("Your active role needs Opportunity view permission.");
        cached = { actorId: actorId!, users, permissions, salesHeadIds: group("SALES"), ceoIds: group("CEO"), lookups, questions: data.rfpQuestionsList.filter(question => question.isActive) };
        cachedAt = Date.now();
        return cached;
      }
      const directory = await loadDirectory(true);
      const store = fixtures.createLocalOpportunityStore(localStorage, directory, process.env.GRAPHQL_API_URL || "http://localhost:4000/graphql");
      return { actorId, token, service: fixtures.createLocalOpportunityService(store, loadDirectory) };
    }, [actorId, token]);
    const runtime = useResource(load, Boolean(actorId && token));
    if (runtime.error) return <Notice title="Unable to load your Opportunity access" error={runtime.error} retry={runtime.reload} />;
    if (!runtime.data || runtime.data.actorId !== actorId || runtime.data.token !== token) return <Loading label="Loading your user and role permissions..." />;
    return <OpportunityServiceContext.Provider value={runtime.data.service}><div key={actorId}>
      <p role="status" className="opp-notice mx-5 mt-4">UI test data is stored in this browser. Use your normal sign out and login to test each real user&apos;s role. Keep using the same browser and app address.</p>
      {children}
    </div></OpportunityServiceContext.Provider>;
  },
}))) : undefined;

function OpportunityRoutes() {
  return (
    <OpportunityAccessProvider>
      <UnsavedProvider>
        <div className="opportunity-root">
          <Routes>
            <Route index element={<PipelinePage />} />
            <Route path="work" element={<PipelinePage queue="MY_WORK" />} />
            <Route path="approvals" element={<PipelinePage queue="MY_APPROVALS" />} />
            <Route path="new" element={<OpportunityFormPage />} />
            <Route path=":id/edit" element={<OpportunityFormPage />} />
            <Route path=":id/details" element={<OpportunityDetailsPage />} />
            <Route path=":id/review" element={<OpportunityDetailsPage review />} />
            <Route path="*" element={<Navigate to="/opportunity" replace />} />
          </Routes>
        </div>
      </UnsavedProvider>
    </OpportunityAccessProvider>
  );
}

// The host supplies routing and layout. Standalone development uses the same
// layout and /opportunity routes, matching mfe-admin's mounting convention.
function AuthedApp() {
  const inRouterContext = useInRouterContext();

  return (
    <>
      <Toaster />
      {inRouterContext ? (
        <OpportunityRoutes />
      ) : (
        <BrowserRouter>
          <AppShell>
            <Routes>
              <Route path="/opportunity/*" element={<OpportunityRoutes />} />
              <Route path="/opportunities/*" element={<OpportunityRouteAlias />} />
              <Route path="*" element={<Navigate to="/opportunity" replace />} />
            </Routes>
          </AppShell>
        </BrowserRouter>
      )}
    </>
  );
}

export function App() {
  const service = useMemo(() => createWorkflowService(getApolloClient()), []);
  return (
    <ApolloProvider client={getApolloClient()}>
      <OpportunityServiceContext.Provider value={service}><AuthGate>
        {LocalEnvironment ? <Suspense fallback={<Loading label="Loading Opportunity workspace…" />}><LocalEnvironment><AuthedApp /></LocalEnvironment></Suspense> : <AuthedApp />}
      </AuthGate></OpportunityServiceContext.Provider>
    </ApolloProvider>
  );
}

export default App;
