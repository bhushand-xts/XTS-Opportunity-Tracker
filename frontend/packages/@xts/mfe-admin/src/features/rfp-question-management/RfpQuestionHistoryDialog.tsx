import type { RfpQuestion, RfpQuestionHistory } from "@xts/api-contracts";
import { Badge } from "@xts/design-system";
import { HistoryDialog, type HistoryField } from "../../components/HistoryDialog";
import { useRfpQuestionHistory } from "./useRfpQuestionHistory";

const FIELDS: HistoryField<RfpQuestionHistory>[] = [
  { key: "question", label: "Question" },
  { key: "description", label: "Description" },
  { key: "displayOrder", label: "Display order" },
  {
    key: "isActive",
    label: "Status",
    render: (row) => <Badge variant={row.isActive ? "success" : "muted"}>{row.isActive ? "Active" : "Inactive"}</Badge>,
  },
];

export function RfpQuestionHistoryDialog({ question, onClose }: { question: RfpQuestion | null; onClose: () => void }) {
  const { history, loading, error } = useRfpQuestionHistory(question?.id);

  return (
    <HistoryDialog
      open={question !== null}
      onOpenChange={(open) => !open && onClose()}
      title={`History — ${question ? question.question.slice(0, 60) : ""}`}
      rows={history}
      fields={FIELDS}
      loading={loading}
      error={error}
    />
  );
}
