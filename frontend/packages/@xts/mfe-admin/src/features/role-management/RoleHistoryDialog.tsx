import { useMemo } from "react";
import type { Role, RoleHistory } from "@xts/api-contracts";
import { Badge } from "@xts/design-system";
import { HistoryDialog, type HistoryField } from "../../components/HistoryDialog";
import { buildUserResolver } from "../../lib/format";
import { useUsers } from "../user-role-assignment/useUsers";
import { useRoleHistory } from "./useRoleHistory";

const FIELDS: HistoryField<RoleHistory>[] = [
  { key: "roleName", label: "Name" },
  { key: "roleCode", label: "Code" },
  { key: "description", label: "Description" },
  {
    key: "isActive",
    label: "Status",
    render: (row) => <Badge variant={row.isActive ? "success" : "muted"}>{row.isActive ? "Active" : "Inactive"}</Badge>,
  },
];

export function RoleHistoryDialog({ role, onClose }: { role: Role | null; onClose: () => void }) {
  const { history, loading, error } = useRoleHistory(role?.id);
  const { users } = useUsers();
  const resolveUser = useMemo(() => buildUserResolver(users), [users]);

  return (
    <HistoryDialog
      open={role !== null}
      onOpenChange={(open) => !open && onClose()}
      title={`History — ${role?.roleName ?? ""}`}
      rows={history}
      fields={FIELDS}
      loading={loading}
      error={error}
      resolveUser={resolveUser}
    />
  );
}
