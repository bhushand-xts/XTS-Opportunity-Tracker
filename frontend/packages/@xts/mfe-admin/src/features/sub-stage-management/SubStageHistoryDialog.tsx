import { useMemo } from "react";
import type { Stage, SubStage, SubStageHistory } from "@xts/api-contracts";
import { Badge } from "@xts/design-system";
import { HistoryDialog, type HistoryField } from "../../components/HistoryDialog";
import { buildUserResolver } from "../../lib/format";
import { useUsers } from "../user-role-assignment/useUsers";
import { useSubStageHistory } from "./useSubStageHistory";

export function SubStageHistoryDialog({
  subStage,
  stages,
  onClose,
}: {
  subStage: SubStage | null;
  stages: Stage[];
  onClose: () => void;
}) {
  const { history, loading, error } = useSubStageHistory(subStage?.id);
  const { users } = useUsers();
  const resolveUser = useMemo(() => buildUserResolver(users), [users]);

  const fields: HistoryField<SubStageHistory>[] = useMemo(
    () => [
      {
        key: "stageId",
        label: "Stage",
        render: (row) => stages.find((s) => s.id === row.stageId)?.stageName ?? "—",
      },
      { key: "subStageName", label: "Name" },
      {
        key: "isActive",
        label: "Status",
        render: (row) => <Badge variant={row.isActive ? "success" : "muted"}>{row.isActive ? "Active" : "Inactive"}</Badge>,
      },
    ],
    [stages]
  );

  return (
    <HistoryDialog
      open={subStage !== null}
      onOpenChange={(open) => !open && onClose()}
      title={`History — ${subStage?.subStageName ?? ""}`}
      rows={history}
      fields={fields}
      loading={loading}
      error={error}
      resolveUser={resolveUser}
    />
  );
}
