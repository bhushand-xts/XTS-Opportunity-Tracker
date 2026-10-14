import { useMemo, useState } from "react";
import { History, Lock, Pencil, Plus, Search, Trash2 } from "lucide-react";
import type { Client } from "@xts/api-contracts";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  Button,
  Card,
  CardContent,
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  Input,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  useAuth,
  useSetPageTitle,
} from "@xts/design-system";
import { PageHeader } from "../../components/PageHeader";
import { ErrorNotice, TableEmptyRow, TableLoadingRows } from "../../components/TableStates";
import { ClientFormDialog } from "./ClientFormDialog";
import { ClientHistoryDialog } from "./ClientHistoryDialog";
import { useClientMutations } from "./useClientMutations";
import { useClients } from "./useClients";

const COLUMNS = 8;
const MENU_KEY = "client_master";

export function ClientMasterPage() {
  useSetPageTitle("Client Master");
  const { clients, loading, error } = useClients();
  const { deleteClient, setClientActive } = useClientMutations();
  const { hasPermission } = useAuth();
  const canView = hasPermission(MENU_KEY, "view");
  const canAdd = hasPermission(MENU_KEY, "add");
  const canEdit = hasPermission(MENU_KEY, "edit");
  const canDelete = hasPermission(MENU_KEY, "delete");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deletingClient, setDeletingClient] = useState<Client | null>(null);
  const [historyClient, setHistoryClient] = useState<Client | null>(null);
  const [search, setSearch] = useState("");

  const visibleClients = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(
      (c) =>
        c.clientName.toLowerCase().includes(q) ||
        (c.sector ?? "").toLowerCase().includes(q) ||
        (c.city ?? "").toLowerCase().includes(q) ||
        (c.country ?? "").toLowerCase().includes(q)
    );
  }, [clients, search]);

  const openAdd = () => {
    setEditingClient(null);
    setDialogOpen(true);
  };
  const openEdit = (client: Client) => {
    setEditingClient(client);
    setDialogOpen(true);
  };
  const confirmDelete = async () => {
    if (!deletingClient) return;
    await deleteClient(deletingClient.id);
    setDeletingClient(null);
  };

  return (
    <div className="space-y-4 p-5">
      <PageHeader
        description="Create and manage client accounts and their contact people."
        actions={
          <>
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search clients"
                aria-label="Search clients"
                className="pl-9"
              />
            </div>
            {canAdd && (
              <Button onClick={openAdd}>
                <Plus className="mr-2 size-4" />
                Add
              </Button>
            )}
          </>
        }
      />

      {error && <ErrorNotice error={error} title="Couldn't load clients" />}

      {!canView ? (
        <Card>
          <CardContent className="py-10">
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Lock />
                </EmptyMedia>
                <EmptyTitle>No view access</EmptyTitle>
                <EmptyDescription>Your role doesn&apos;t have permission to view Client Master.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="overflow-x-auto pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Account type</TableHead>
                  <TableHead>Sector</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Contacts</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && <TableLoadingRows columns={COLUMNS} />}
                {!loading && !error && clients.length === 0 && (
                  <TableEmptyRow columns={COLUMNS} message="No clients yet. Add the first one." />
                )}
                {!loading && clients.length > 0 && visibleClients.length === 0 && (
                  <TableEmptyRow columns={COLUMNS} message="No clients match your search." />
                )}
                {visibleClients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">{client.clientName}</TableCell>
                    <TableCell className="text-muted-foreground">{client.accountType ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{client.sector ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {[client.city, client.country].filter(Boolean).join(", ") || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{client.contacts.length}</TableCell>
                    <TableCell>
                      <Badge variant={client.isActive ? "success" : "muted"}>
                        {client.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={client.isActive}
                        disabled={!canEdit}
                        aria-label={`${client.isActive ? "Deactivate" : "Activate"} ${client.clientName}`}
                        onCheckedChange={(checked) => void setClientActive(client.id, checked)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`History of ${client.clientName}`}
                        onClick={() => setHistoryClient(client)}
                      >
                        <History className="size-4" />
                      </Button>
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Edit ${client.clientName}`}
                          onClick={() => openEdit(client)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Delete ${client.clientName}`}
                          onClick={() => setDeletingClient(client)}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <ClientFormDialog open={dialogOpen} onOpenChange={setDialogOpen} client={editingClient} allClients={clients} />
      <ClientHistoryDialog client={historyClient} onClose={() => setHistoryClient(null)} />

      <AlertDialog open={deletingClient !== null} onOpenChange={(open) => !open && setDeletingClient(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete client?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &quot;{deletingClient?.clientName}&quot; and its contact people.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
