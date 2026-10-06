import { Navigate, useParams } from "react-router-dom";
import { useStore } from "@xts/design-system";
import { AnswerWorkspacePage } from "./AnswerWorkspacePage";

// Looks up the opportunity and question by id, same pattern as IntakeRouter
// and QuestionReviewRoute. Redirects to Question Review if either is missing
// (e.g. a stale link, or the question was withdrawn).
export function AnswerWorkspaceRoute() {
  const { opportunityId, questionId } = useParams<{ opportunityId: string; questionId: string }>();
  const { opportunities, questions } = useStore();
  const opportunity = opportunities.find((o) => o.id === opportunityId);
  const question = questions.find((q) => q.id === questionId && !q.withdrawn);

  if (!opportunity) return <Navigate to="/opportunities" replace />;
  if (!question) return <Navigate to={`/opportunities/${opportunity.id}/questions`} replace />;
  return <AnswerWorkspacePage opportunity={opportunity} question={question} />;
}
