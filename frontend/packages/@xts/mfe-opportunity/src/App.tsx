import { ApolloProvider } from "@apollo/client";
import { BrowserRouter, Navigate, Route, Routes, useInRouterContext } from "react-router-dom";
import { getApolloClient } from "@xts/api-client";
import { AppShell, AuthGate, OpportunityRouteAlias, Toaster } from "@xts/design-system";
import { PipelinePage } from "./components/PipelinePage";
import { OpportunityFormPage } from "./components/OpportunityFormPage";
import { OpportunityDetailsPage } from "./components/OpportunityDetailsPage";
import { OpportunityAccessProvider } from "./hooks/useOpportunityAccess";
import { UnsavedProvider } from "./hooks/useUnsaved";
import { OpportunityServiceContext, productionOpportunityService } from "./services/OpportunityService";
import "./opportunity.css";

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
  return (
    <ApolloProvider client={getApolloClient()}>
      <OpportunityServiceContext.Provider value={productionOpportunityService}><AuthGate>
        <AuthedApp />
      </AuthGate></OpportunityServiceContext.Provider>
    </ApolloProvider>
  );
}

export default App;
