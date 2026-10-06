import { Navigate, useParams } from "react-router-dom";
import { useStore } from "@xts/design-system";
import { QuestionReviewPage } from "./QuestionReviewPage";

// Looks up the opportunity by :opportunityId, same pattern as IntakeRouter.
export function QuestionReviewRoute() {
  const { opportunityId } = useParams<{ opportunityId: string }>();
  const { opportunities } = useStore();
  const opportunity = opportunities.find((o) => o.id === opportunityId);

  if (!opportunity) return <Navigate to="/opportunities" replace />;
  return <QuestionReviewPage opportunity={opportunity} />;
}
