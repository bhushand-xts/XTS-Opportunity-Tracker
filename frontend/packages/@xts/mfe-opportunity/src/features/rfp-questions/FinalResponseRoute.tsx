import { Navigate, useParams } from "react-router-dom";
import { useStore } from "@xts/design-system";
import { FinalResponsePage } from "./FinalResponsePage";

export function FinalResponseRoute() {
  const { opportunityId } = useParams<{ opportunityId: string }>();
  const { opportunities } = useStore();
  const opportunity = opportunities.find((o) => o.id === opportunityId);

  if (!opportunity) return <Navigate to="/opportunities" replace />;
  return <FinalResponsePage opportunity={opportunity} />;
}
