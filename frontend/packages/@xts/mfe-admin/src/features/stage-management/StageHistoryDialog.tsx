import { useMemo } from "react";
import type { Stage, StageHistory } from "@xts/api-contracts";
import { Badge } from "@xts/design-system";
import { HistoryDialog, type HistoryField } from "../../components/HistoryDialog";
import { buildUserResolver } from "../../lib/format";
import { useUsers } from "../user-role-assignment/useUsers";
import { useStageHistory } from "./useStageHistory";

const FIELDS: HistoryField<StageHistory>[] = [
  { key: "stageName", label: "Name" },
  { key: "gate", label: "Gate" },
  { key: "winPercentage", label: "Win %" },
  { key: "displayOrder", label: "Sequence" },
  {
    key: "isActive",
    label: "Status",
    render: (row) => <Badge variant={row.isActive ? "success" : "muted"}>{row.isActive ? "Active" : "Inactive"}</Badge>,
  },
];

export function StageHistoryDialog({ stage, onClose }: { stage: Stage | null; onClose: () => void }) {
  const { history, loading, error } = useStageHistory(stage?.id);
  const { users } = useUsers();
  const resolveUser = useMemo(() => buildUserResolver(users), [users]);

  return (
    <HistoryDialog
      open={stage !== null}
      onOpenChange={(open) => !open && onClose()}
      title={`History — ${stage?.stageName ?? ""}`}
      rows={history}
      fields={FIELDS}
      loading={loading}
      error={error}
      resolveUser={resolveUser}
    />
  );
}
