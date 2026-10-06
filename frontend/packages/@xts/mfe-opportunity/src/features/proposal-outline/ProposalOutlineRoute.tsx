import { Navigate, useParams } from "react-router-dom";
import { useStore } from "@xts/design-system";
import { ProposalOutlinePage } from "./ProposalOutlinePage";

export function ProposalOutlineRoute() {
  const { opportunityId } = useParams<{ opportunityId: string }>();
  const { opportunities } = useStore();
  const opportunity = opportunities.find((o) => o.id === opportunityId);

  if (!opportunity) return <Navigate to="/opportunities" replace />;
  return <ProposalOutlinePage opportunity={opportunity} />;
}
