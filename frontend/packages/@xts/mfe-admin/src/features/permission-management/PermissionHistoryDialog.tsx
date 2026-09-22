import type { Permission, PermissionHistory } from "@xts/api-contracts";
import { Badge } from "@xts/design-system";
import { HistoryDialog, type HistoryField } from "../../components/HistoryDialog";
import { usePermissionHistory } from "./usePermissionHistory";

const FIELDS: HistoryField<PermissionHistory>[] = [
  { key: "permissionName", label: "Name" },
  { key: "permissionKey", label: "Key" },
  { key: "description", label: "Description" },
  {
    key: "isActive",
    label: "Status",
    render: (row) => <Badge variant={row.isActive ? "success" : "muted"}>{row.isActive ? "Active" : "Inactive"}</Badge>,
  },
];

export function PermissionHistoryDialog({
  permission,
  onClose,
}: {
  permission: Permission | null;
  onClose: () => void;
}) {
  const { history, loading, error } = usePermissionHistory(permission?.permissionId);

  return (
    <HistoryDialog
      open={permission !== null}
      onOpenChange={(open) => !open && onClose()}
      title={`History — ${permission?.permissionName ?? ""}`}
      rows={history}
      fields={FIELDS}
      loading={loading}
      error={error}
    />
  );
}
