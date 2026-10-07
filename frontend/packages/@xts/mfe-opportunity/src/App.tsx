import { ApolloProvider } from "@apollo/client";
import { BrowserRouter, Navigate, Route, Routes, useInRouterContext } from "react-router-dom";
import { getApolloClient } from "@xts/api-client";
import { AppShell, AuthGate, Toaster } from "@xts/design-system";
import { OpportunityAccessGate } from "./OpportunityAccessGate";
import { DashboardPlaceholderPage } from "./features/dashboard/DashboardPlaceholderPage";
import { IntakeRouter } from "./features/opportunity-create/IntakeRouter";
import { Step1Details } from "./features/opportunity-create/Step1Details";
import { OpportunityDetailRoute } from "./features/opportunity-detail/OpportunityDetailRoute";
import { OpportunityListPage } from "./features/pipeline/OpportunityListPage";
import { PipelineBoard } from "./features/pipeline/PipelineBoard";
import { ProposalOutlineRoute } from "./features/proposal-outline/ProposalOutlineRoute";
import { AnswerWorkspaceRoute } from "./features/rfp-questions/AnswerWorkspaceRoute";
import { FinalResponseRoute } from "./features/rfp-questions/FinalResponseRoute";
import { ProgressDashboardRoute } from "./features/rfp-questions/ProgressDashboardRoute";
import { QuestionReviewRoute } from "./features/rfp-questions/QuestionReviewRoute";

// The mockup ("opportunity-tracker-mockups.html") is now the source of truth
// for this MFE's shape — a sales pipeline (kanban), not a standalone RFP
// workspace. Built in phases per that mockup: Phase 1 (Pipeline board),
// Phase 2 (New Opportunity wizard, Step 1) and Phase 3 (RFP/Generic intake)
// are routed so far. Step 1 creates the real record on submit, so intake
// addresses it by id — no wizard-context hand-off needed past Step 1.
function OpportunityRoutes() {
  return (
    <OpportunityAccessGate>
      <Routes>
        <Route index element={<PipelineBoard />} />
        <Route path="new" element={<Step1Details />} />
        <Route path="dashboard" element={<DashboardPlaceholderPage />} />
        <Route path="all" element={<OpportunityListPage mineOnly={false} />} />
        <Route path="mine" element={<OpportunityListPage mineOnly={true} />} />
        <Route path=":opportunityId" element={<OpportunityDetailRoute />} />
        <Route path=":opportunityId/intake" element={<IntakeRouter />} />
        <Route path=":opportunityId/questions" element={<QuestionReviewRoute />} />
        <Route path=":opportunityId/questions/:questionId/answer" element={<AnswerWorkspaceRoute />} />
        <Route path=":opportunityId/final-response" element={<FinalResponseRoute />} />
        <Route path=":opportunityId/progress" element={<ProgressDashboardRoute />} />
        <Route path=":opportunityId/proposal-outline" element={<ProposalOutlineRoute />} />
      </Routes>
    </OpportunityAccessGate>
  );
}

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
              <Route path="/opportunities/*" element={<OpportunityRoutes />} />
              <Route path="*" element={<Navigate to="/opportunities" replace />} />
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
