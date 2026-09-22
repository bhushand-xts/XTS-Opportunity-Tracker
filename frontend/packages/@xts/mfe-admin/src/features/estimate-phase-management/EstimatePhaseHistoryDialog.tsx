import type { EstimationPhase, EstimationPhaseHistory } from "@xts/api-contracts";
import { Badge } from "@xts/design-system";
import { HistoryDialog, type HistoryField } from "../../components/HistoryDialog";
import { useEstimatePhaseHistory } from "./useEstimatePhaseHistory";

const FIELDS: HistoryField<EstimationPhaseHistory>[] = [
  { key: "phaseName", label: "Name" },
  { key: "phaseCode", label: "Code" },
  { key: "description", label: "Description" },
  { key: "displayOrder", label: "Display order" },
  {
    key: "isActive",
    label: "Status",
    render: (row) => <Badge variant={row.isActive ? "success" : "muted"}>{row.isActive ? "Active" : "Inactive"}</Badge>,
  },
];

export function EstimatePhaseHistoryDialog({ phase, onClose }: { phase: EstimationPhase | null; onClose: () => void }) {
  const { history, loading, error } = useEstimatePhaseHistory(phase?.id);

  return (
    <HistoryDialog
      open={phase !== null}
      onOpenChange={(open) => !open && onClose()}
      title={`History — ${phase?.phaseName ?? ""}`}
      rows={history}
      fields={FIELDS}
      loading={loading}
      error={error}
    />
  );
}
