import { useMemo, useState } from "react";
import { History, Lock, Pencil, Plus, Search, Trash2 } from "lucide-react";
import type { ReasonCode } from "@xts/api-contracts";
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
import { ReasonCodeFormDialog } from "./ReasonCodeFormDialog";
import { ReasonCodeHistoryDialog } from "./ReasonCodeHistoryDialog";
import { useReasonCodeMutations } from "./useReasonCodeMutations";
import { useReasonCodes } from "./useReasonCodes";

const COLUMNS = 6;
const MENU_KEY = "reason_code_master";

export function ReasonCodeMasterPage() {
  useSetPageTitle("Reason Code Master");
  const { reasonCodes, loading, error } = useReasonCodes();
  const { deleteReasonCode, setReasonCodeActive } = useReasonCodeMutations();
  const { hasPermission } = useAuth();
  const canView = hasPermission(MENU_KEY, "view");
  const canAdd = hasPermission(MENU_KEY, "add");
  const canEdit = hasPermission(MENU_KEY, "edit");
  const canDelete = hasPermission(MENU_KEY, "delete");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReasonCode, setEditingReasonCode] = useState<ReasonCode | null>(null);
  const [deletingReasonCode, setDeletingReasonCode] = useState<ReasonCode | null>(null);
  const [historyReasonCode, setHistoryReasonCode] = useState<ReasonCode | null>(null);
  const [search, setSearch] = useState("");

  const visibleReasonCodes = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return reasonCodes;
    return reasonCodes.filter((r) => r.reasonName.toLowerCase().includes(q));
  }, [reasonCodes, search]);

  const openAdd = () => {
    setEditingReasonCode(null);
    setDialogOpen(true);
  };
  const openEdit = (reasonCode: ReasonCode) => {
    setEditingReasonCode(reasonCode);
    setDialogOpen(true);
  };
  const confirmDelete = async () => {
    if (!deletingReasonCode) return;
    await deleteReasonCode(deletingReasonCode.id);
    setDeletingReasonCode(null);
  };

  return (
    <div className="space-y-4 p-5">
      <PageHeader
        description="Create and manage the reason codes used elsewhere in the app."
        actions={
          <>
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search reason code"
                aria-label="Search reason codes"
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

      {error && <ErrorNotice error={error} title="Couldn't load reason codes" />}

      {!canView ? (
        <Card>
          <CardContent className="py-10">
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Lock />
                </EmptyMedia>
                <EmptyTitle>No view access</EmptyTitle>
                <EmptyDescription>Your role doesn&apos;t have permission to view Reason Code Master.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reason code</TableHead>
                  <TableHead>Reason description</TableHead>
                  <TableHead>Display order</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && <TableLoadingRows columns={COLUMNS} />}
                {!loading && !error && reasonCodes.length === 0 && (
                  <TableEmptyRow columns={COLUMNS} message="No reason codes yet. Add the first one." />
                )}
                {!loading && reasonCodes.length > 0 && visibleReasonCodes.length === 0 && (
                  <TableEmptyRow columns={COLUMNS} message="No reason codes match your search." />
                )}
                {visibleReasonCodes.map((reasonCode) => (
                  <TableRow key={reasonCode.id}>
                    <TableCell className="font-medium">{reasonCode.reasonName}</TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">
                      {reasonCode.description ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{reasonCode.displayOrder ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={reasonCode.isActive ? "success" : "muted"}>
                        {reasonCode.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={reasonCode.isActive}
                        disabled={!canEdit}
                        aria-label={`${reasonCode.isActive ? "Deactivate" : "Activate"} ${reasonCode.reasonName}`}
                        onCheckedChange={(checked) => void setReasonCodeActive(reasonCode.id, checked)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`History of ${reasonCode.reasonName}`}
                        onClick={() => setHistoryReasonCode(reasonCode)}
                      >
                        <History className="size-4" />
                      </Button>
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Edit ${reasonCode.reasonName}`}
                          onClick={() => openEdit(reasonCode)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Delete ${reasonCode.reasonName}`}
                          onClick={() => setDeletingReasonCode(reasonCode)}
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

      <ReasonCodeFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        reasonCode={editingReasonCode}
        allReasonCodes={reasonCodes}
      />
      <ReasonCodeHistoryDialog reasonCode={historyReasonCode} onClose={() => setHistoryReasonCode(null)} />

      <AlertDialog open={deletingReasonCode !== null} onOpenChange={(open) => !open && setDeletingReasonCode(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete reason code?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &quot;{deletingReasonCode?.reasonName}&quot;.
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
