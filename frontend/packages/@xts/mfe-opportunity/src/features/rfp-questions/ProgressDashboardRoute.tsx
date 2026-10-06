import { Navigate, useParams } from "react-router-dom";
import { useStore } from "@xts/design-system";
import { ProgressDashboardPage } from "./ProgressDashboardPage";

export function ProgressDashboardRoute() {
  const { opportunityId } = useParams<{ opportunityId: string }>();
  const { opportunities } = useStore();
  const opportunity = opportunities.find((o) => o.id === opportunityId);

  if (!opportunity) return <Navigate to="/opportunities" replace />;
  return <ProgressDashboardPage opportunity={opportunity} />;
}
