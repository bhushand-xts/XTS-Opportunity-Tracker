import { BrowserRouter, Routes, Route } from "react-router-dom";
import { loadRemote } from "../remotes/loadRemote";
import { AppShellLayout } from "../layout/AppShellLayout";

const OpportunityPipeline = loadRemote(() => import("opportunityPipeline/Module"));
const EstimationRates = loadRemote(() => import("estimationRates/Module"));
const ApprovalsGates = loadRemote(() => import("approvalsGates/Module"));
const Documents = loadRemote(() => import("documents/Module"));
const RfpIntake = loadRemote(() => import("rfpIntake/Module"));

export function AppRouter() {
  return (
    <BrowserRouter>
      <AppShellLayout>
        <Routes>
          <Route path="/opportunities/*" element={<OpportunityPipeline />} />
          <Route path="/estimation/*" element={<EstimationRates />} />
          <Route path="/approvals/*" element={<ApprovalsGates />} />
          <Route path="/documents/*" element={<Documents />} />
          <Route path="/rfp/*" element={<RfpIntake />} />
        </Routes>
      </AppShellLayout>
    </BrowserRouter>
  );
}
