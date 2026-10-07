import { Navigate, useParams } from "react-router-dom";
import { useStore } from "@xts/design-system";
import { OpportunityDetailPage } from "./OpportunityDetailPage";

// Looks up the opportunity by :opportunityId, same pattern as QuestionReviewRoute.
export function OpportunityDetailRoute() {
  const { opportunityId } = useParams<{ opportunityId: string }>();
  const { opportunities } = useStore();
  const opportunity = opportunities.find((o) => o.id === opportunityId);

  if (!opportunity) return <Navigate to="/opportunities" replace />;
  return <OpportunityDetailPage opportunity={opportunity} />;
}
