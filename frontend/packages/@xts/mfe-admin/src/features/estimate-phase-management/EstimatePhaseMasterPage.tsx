import { useMemo, useState } from "react";
import { History, Pencil, Plus, Search, Trash2 } from "lucide-react";
import type { EstimationPhase } from "@xts/api-contracts";
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
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  useSetPageTitle,
} from "@xts/design-system";
import { PageHeader } from "../../components/PageHeader";
import { ErrorNotice, TableEmptyRow, TableLoadingRows } from "../../components/TableStates";
import { EstimatePhaseFormDialog } from "./EstimatePhaseFormDialog";
import { EstimatePhaseHistoryDialog } from "./EstimatePhaseHistoryDialog";
import { useEstimatePhaseMutations } from "./useEstimatePhaseMutations";
import { useEstimatePhases } from "./useEstimatePhases";

const COLUMNS = 6;

export function EstimatePhaseMasterPage() {
  useSetPageTitle("Estimate Phase Master");
  const { phases, loading, error } = useEstimatePhases();
  const { deleteEstimatePhase } = useEstimatePhaseMutations();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPhase, setEditingPhase] = useState<EstimationPhase | null>(null);
  const [deletingPhase, setDeletingPhase] = useState<EstimationPhase | null>(null);
  const [historyPhase, setHistoryPhase] = useState<EstimationPhase | null>(null);
  const [search, setSearch] = useState("");

  const visiblePhases = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return phases;
    return phases.filter((p) => `${p.phaseName} ${p.phaseCode ?? ""}`.toLowerCase().includes(q));
  }, [phases, search]);

  const openAdd = () => {
    setEditingPhase(null);
    setDialogOpen(true);
  };
  const openEdit = (phase: EstimationPhase) => {
    setEditingPhase(phase);
    setDialogOpen(true);
  };
  const confirmDelete = async () => {
    if (!deletingPhase) return;
    await deleteEstimatePhase(deletingPhase.id);
    setDeletingPhase(null);
  };

  return (
    <div className="space-y-4 p-5">
      <PageHeader
        description="Create and manage the phases used during the estimation process."
        actions={
          <>
            <div className="relative w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search phase name or code"
                aria-label="Search estimate phases"
                className="pl-9"
              />
            </div>
            <Button onClick={openAdd}>
              <Plus className="mr-2 size-4" />
              Add
            </Button>
          </>
        }
      />

      {error && <ErrorNotice error={error} title="Couldn't load estimate phases" />}

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Phase name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Display order</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && <TableLoadingRows columns={COLUMNS} />}
              {!loading && !error && phases.length === 0 && (
                <TableEmptyRow columns={COLUMNS} message="No estimate phases yet. Add the first one." />
              )}
              {!loading && phases.length > 0 && visiblePhases.length === 0 && (
                <TableEmptyRow columns={COLUMNS} message="No estimate phases match your search." />
              )}
              {visiblePhases.map((phase) => (
                <TableRow key={phase.id}>
                  <TableCell className="font-medium">{phase.phaseName}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{phase.phaseCode ?? "—"}</TableCell>
                  <TableCell className="max-w-xs truncate text-muted-foreground">{phase.description ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{phase.displayOrder ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={phase.isActive ? "success" : "muted"}>{phase.isActive ? "Active" : "Inactive"}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`History of ${phase.phaseName}`}
                      onClick={() => setHistoryPhase(phase)}
                    >
                      <History className="size-4" />
                    </Button>
                    <Button variant="ghost" size="icon" aria-label={`Edit ${phase.phaseName}`} onClick={() => openEdit(phase)}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Delete ${phase.phaseName}`}
                      onClick={() => setDeletingPhase(phase)}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <EstimatePhaseFormDialog open={dialogOpen} onOpenChange={setDialogOpen} phase={editingPhase} allPhases={phases} />
      <EstimatePhaseHistoryDialog phase={historyPhase} onClose={() => setHistoryPhase(null)} />

      <AlertDialog open={deletingPhase !== null} onOpenChange={(open) => !open && setDeletingPhase(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete estimate phase?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &quot;{deletingPhase?.phaseName}&quot;.
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
