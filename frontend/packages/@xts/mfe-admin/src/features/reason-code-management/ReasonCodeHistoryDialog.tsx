import { useMemo } from "react";
import type { ReasonCode, ReasonCodeHistory } from "@xts/api-contracts";
import { Badge } from "@xts/design-system";
import { HistoryDialog, type HistoryField } from "../../components/HistoryDialog";
import { buildUserResolver } from "../../lib/format";
import { useUsers } from "../user-role-assignment/useUsers";
import { useReasonCodeHistory } from "./useReasonCodeHistory";

const FIELDS: HistoryField<ReasonCodeHistory>[] = [
  { key: "reasonName", label: "Name" },
  { key: "description", label: "Description" },
  { key: "displayOrder", label: "Display order" },
  {
    key: "isActive",
    label: "Status",
    render: (row) => <Badge variant={row.isActive ? "success" : "muted"}>{row.isActive ? "Active" : "Inactive"}</Badge>,
  },
];

export function ReasonCodeHistoryDialog({
  reasonCode,
  onClose,
}: {
  reasonCode: ReasonCode | null;
  onClose: () => void;
}) {
  const { history, loading, error } = useReasonCodeHistory(reasonCode?.id);
  const { users } = useUsers();
  const resolveUser = useMemo(() => buildUserResolver(users), [users]);

  return (
    <HistoryDialog
      open={reasonCode !== null}
      onOpenChange={(open) => !open && onClose()}
      title={`History — ${reasonCode?.reasonName ?? ""}`}
      rows={history}
      fields={FIELDS}
      loading={loading}
      error={error}
      resolveUser={resolveUser}
    />
  );
}
