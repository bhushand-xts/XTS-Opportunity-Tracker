import { ApolloProvider } from "@apollo/client";
import { BrowserRouter, Navigate, Route, Routes, useInRouterContext, useLocation } from "react-router-dom";
import { getApolloClient } from "@xts/api-client";
import { AppShell, AuthGate, OpportunityRouteAlias, Toaster } from "@xts/design-system";
import { PipelinePage } from "./components/PipelinePage";
import { OpportunityFormPage } from "./components/OpportunityFormPage";
import { OpportunityDetailsPage } from "./components/OpportunityDetailsPage";
import { OpportunitySummaryReport } from "./components/OpportunitySummaryReport";
import { PendingApprovalsReport } from "./components/PendingApprovalsReport";
import { TrendReport } from "./components/TrendReport";
import { OpportunityAccessProvider } from "./hooks/useOpportunityAccess";
import { UnsavedProvider } from "./hooks/useUnsaved";
import { OpportunityServiceContext, productionOpportunityService } from "./services/OpportunityService";
import "./opportunity.css";

const opportunityService = productionOpportunityService;

function OpportunityRoutes() {
  const location = useLocation();
  const isSummaryReportRoute = location.pathname === "/reports/opportunity_summary";
  const isPendingApprovalsRoute = location.pathname === "/reports/opportunity_pending_approval";
  const isTrendReportRoute = location.pathname === "/reports/trend_report";
  const isReportRoute = isSummaryReportRoute || isPendingApprovalsRoute || isTrendReportRoute;
  return (
    <OpportunityAccessProvider>
      <UnsavedProvider>
        <div className={`opportunity-root${isReportRoute ? ' opportunity-summary-root' : ''}`}>
          {isSummaryReportRoute ? <OpportunitySummaryReport /> : isPendingApprovalsRoute ? <PendingApprovalsReport /> : isTrendReportRoute ? <TrendReport /> : <Routes>
            <Route index element={<PipelinePage />} />
            <Route path="work" element={<PipelinePage queue="MY_WORK" />} />
            <Route path="approvals" element={<PipelinePage queue="MY_APPROVALS" />} />
            {/* Dynamic navigation routes and the opportunity summary report. */}
            <Route path="pipeline" element={<PipelinePage />} />
            <Route path="my_work" element={<PipelinePage queue="MY_WORK" />} />
            <Route path="my_approvals" element={<PipelinePage queue="MY_APPROVALS" />} />
            <Route path="reports/summary" element={<OpportunitySummaryReport />} />
            <Route path="new" element={<OpportunityFormPage />} />
            <Route path=":id/edit" element={<OpportunityFormPage />} />
            <Route path=":id/details" element={<OpportunityDetailsPage />} />
            <Route path=":id/review" element={<OpportunityDetailsPage review />} />
            <Route path="*" element={<Navigate to="/opportunity" replace />} />
          </Routes>}
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
      <Toaster richColors />
      {inRouterContext ? (
        <OpportunityRoutes />
      ) : (
        <BrowserRouter>
          <AppShell>
            <Routes>
              <Route path="/opportunity/*" element={<OpportunityRoutes />} />
              <Route path="/reports/opportunity_summary" element={<OpportunityRoutes />} />
              <Route path="/reports/opportunity_pending_approval" element={<OpportunityRoutes />} />
              <Route path="/reports/trend_report" element={<OpportunityRoutes />} />
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
      <OpportunityServiceContext.Provider value={opportunityService}><AuthGate>
        <AuthedApp />
      </AuthGate></OpportunityServiceContext.Provider>
    </ApolloProvider>
  );
}

export default App;
