import { useMemo, useState } from "react";
import { History, Lock, Pencil, Plus, Search } from "lucide-react";
import type { Stage } from "@xts/api-contracts";
import {
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
import { StageFormDialog } from "./StageFormDialog";
import { StageHistoryDialog } from "./StageHistoryDialog";
import { useStages } from "./useStages";

const COLUMNS = 6;
const MENU_KEY = "stage_master";

export function StageMasterPage() {
  useSetPageTitle("Stage Master");

  const { stages, loading, error } = useStages();
  const { hasPermission } = useAuth();
  const canView = hasPermission(MENU_KEY, "view");
  const canAdd = hasPermission(MENU_KEY, "add");
  const canEdit = hasPermission(MENU_KEY, "edit");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<Stage | null>(null);
  const [historyStage, setHistoryStage] = useState<Stage | null>(null);
  const [search, setSearch] = useState("");

  const visibleStages = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return stages;
    return stages.filter((s) => `${s.stageName} ${s.gate ?? ""}`.toLowerCase().includes(q));
  }, [stages, search]);

  function openAdd() {
    setEditingStage(null);
    setDialogOpen(true);
  }

  function openEdit(stage: Stage) {
    setEditingStage(stage);
    setDialogOpen(true);
  }

  return (
    <div className="space-y-4 p-5">
      <PageHeader
        description="Define the stages of the opportunity lifecycle."
        actions={
          <>
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search stage or gate"
                aria-label="Search stages"
                className="pl-9"
              />
            </div>
            {canAdd && (
              <Button onClick={openAdd}>
                <Plus className="mr-2 size-4" />
                Add Stage
              </Button>
            )}
          </>
        }
      />

      {error && <ErrorNotice error={error} title="Couldn't load stages" />}

      {!canView ? (
        <Card>
          <CardContent className="py-10">
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Lock />
                </EmptyMedia>
                <EmptyTitle>No view access</EmptyTitle>
                <EmptyDescription>Your role doesn&apos;t have permission to view Stage Master.</EmptyDescription>
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
                  <TableHead>Stage name</TableHead>
                  <TableHead>Win %</TableHead>
                  <TableHead>Gate</TableHead>
                  <TableHead>Sequence</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && <TableLoadingRows columns={COLUMNS} />}
                {!loading && !error && stages.length === 0 && (
                  <TableEmptyRow columns={COLUMNS} message="No stages yet. Add the first one." />
                )}
                {!loading && stages.length > 0 && visibleStages.length === 0 && (
                  <TableEmptyRow columns={COLUMNS} message="No stages match your search." />
                )}
                {visibleStages.map((stage) => (
                  <TableRow key={stage.id}>
                    <TableCell className="font-medium">{stage.stageName}</TableCell>
                    <TableCell className="text-muted-foreground">{stage.winPercentage}%</TableCell>
                    <TableCell className="text-muted-foreground">{stage.gate ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{stage.displayOrder ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={stage.isActive ? "success" : "muted"}>
                        {stage.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`History of ${stage.stageName}`}
                        onClick={() => setHistoryStage(stage)}
                      >
                        <History className="size-4" />
                      </Button>
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={stage.inUse}
                          title={stage.inUse ? "This stage is used by one or more opportunities and can't be edited." : undefined}
                          aria-label={`Edit ${stage.stageName}`}
                          onClick={() => openEdit(stage)}
                        >
                          <Pencil className="size-4" />
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

      <StageFormDialog open={dialogOpen} onOpenChange={setDialogOpen} stage={editingStage} allStages={stages} />
      <StageHistoryDialog stage={historyStage} onClose={() => setHistoryStage(null)} />
    </div>
  );
}
