import { Navigate, useParams } from "react-router-dom";
import { useStore } from "@xts/design-system";
import { GenericIntakePage } from "./GenericIntakePage";
import { QuestionnaireIntakePage } from "./QuestionnaireIntakePage";

// Dispatches to the right intake screen based on the record's own rfpType —
// no context/draft state needed since Step 1 already created a real record
// (see the plan: this replaces the Phase 2 wizard-context approach).
export function IntakeRouter() {
  const { opportunityId } = useParams<{ opportunityId: string }>();
  const { opportunities } = useStore();
  const opportunity = opportunities.find((o) => o.id === opportunityId);

  if (!opportunity) return <Navigate to="/opportunities" replace />;
  if (opportunity.rfpType === "Generic") return <GenericIntakePage opportunity={opportunity} />;
  return <QuestionnaireIntakePage opportunity={opportunity} />;
}
