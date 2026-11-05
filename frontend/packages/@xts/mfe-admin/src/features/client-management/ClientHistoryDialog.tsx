import { useMemo } from "react";
import type { Client, ClientHistory } from "@xts/api-contracts";
import { Badge } from "@xts/design-system";
import { HistoryDialog, type HistoryField } from "../../components/HistoryDialog";
import { buildUserResolver } from "../../lib/format";
import { useUsers } from "../user-role-assignment/useUsers";
import { useClientHistory } from "./useClientHistory";

const FIELDS: HistoryField<ClientHistory>[] = [
  { key: "clientName", label: "Name" },
  { key: "accountType", label: "Account type" },
  { key: "sector", label: "Sector" },
  { key: "website", label: "Website" },
  { key: "city", label: "City" },
  { key: "state", label: "State" },
  { key: "country", label: "Country" },
  { key: "streetAddress", label: "Street address" },
  {
    key: "isActive",
    label: "Status",
    render: (row) => <Badge variant={row.isActive ? "success" : "muted"}>{row.isActive ? "Active" : "Inactive"}</Badge>,
  },
];

export function ClientHistoryDialog({ client, onClose }: { client: Client | null; onClose: () => void }) {
  const { history, loading, error } = useClientHistory(client?.id);
  const { users } = useUsers();
  const resolveUser = useMemo(() => buildUserResolver(users), [users]);

  return (
    <HistoryDialog
      open={client !== null}
      onOpenChange={(open) => !open && onClose()}
      title={`History — ${client?.clientName ?? ""}`}
      rows={history}
      fields={FIELDS}
      loading={loading}
      error={error}
      resolveUser={resolveUser}
    />
  );
}
