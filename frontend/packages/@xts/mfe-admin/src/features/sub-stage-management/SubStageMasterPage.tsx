import { useMemo, useState } from "react";
import { History, Lock, Pencil, Plus, Search } from "lucide-react";
import type { SubStage } from "@xts/api-contracts";
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
import { useStages } from "../stage-management/useStages";
import { SubStageFormDialog } from "./SubStageFormDialog";
import { SubStageHistoryDialog } from "./SubStageHistoryDialog";
import { useSubStages } from "./useSubStages";

const COLUMNS = 4;
const MENU_KEY = "sub_stage_master";

export function SubStageMasterPage() {
  useSetPageTitle("Sub Stage Master");

  const { subStages, loading, error } = useSubStages();
  const { stages } = useStages();
  const { hasPermission } = useAuth();
  const canView = hasPermission(MENU_KEY, "view");
  const canAdd = hasPermission(MENU_KEY, "add");
  const canEdit = hasPermission(MENU_KEY, "edit");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSubStage, setEditingSubStage] = useState<SubStage | null>(null);
  const [historySubStage, setHistorySubStage] = useState<SubStage | null>(null);
  const [search, setSearch] = useState("");

  const stageName = (stageId: number) => stages.find((s) => s.id === stageId)?.stageName ?? "—";

  const visibleSubStages = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return subStages;
    return subStages.filter((s) =>
      `${s.subStageName} ${stageName(s.stageId)}`.toLowerCase().includes(q)
    );
  }, [subStages, search, stages]);

  function openAdd() {
    setEditingSubStage(null);
    setDialogOpen(true);
  }

  function openEdit(subStage: SubStage) {
    setEditingSubStage(subStage);
    setDialogOpen(true);
  }

  return (
    <div className="space-y-4 p-5">
      <PageHeader
        description="Define the sub stages within a stage's approval chain."
        actions={
          <>
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search sub stage or stage"
                aria-label="Search sub stages"
                className="pl-9"
              />
            </div>
            {canAdd && (
              <Button onClick={openAdd}>
                <Plus className="mr-2 size-4" />
                Add Sub Stage
              </Button>
            )}
          </>
        }
      />

      {error && <ErrorNotice error={error} title="Couldn't load sub stages" />}

      {!canView ? (
        <Card>
          <CardContent className="py-10">
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Lock />
                </EmptyMedia>
                <EmptyTitle>No view access</EmptyTitle>
                <EmptyDescription>Your role doesn&apos;t have permission to view Sub Stage Master.</EmptyDescription>
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
                  <TableHead>Stage</TableHead>
                  <TableHead>Sub stage name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && <TableLoadingRows columns={COLUMNS} />}
                {!loading && !error && subStages.length === 0 && (
                  <TableEmptyRow columns={COLUMNS} message="No sub stages yet. Add the first one." />
                )}
                {!loading && subStages.length > 0 && visibleSubStages.length === 0 && (
                  <TableEmptyRow columns={COLUMNS} message="No sub stages match your search." />
                )}
                {visibleSubStages.map((subStage) => (
                  <TableRow key={subStage.id}>
                    <TableCell className="font-medium">{stageName(subStage.stageId)}</TableCell>
                    <TableCell className="text-muted-foreground">{subStage.subStageName}</TableCell>
                    <TableCell>
                      <Badge variant={subStage.isActive ? "success" : "muted"}>
                        {subStage.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`History of ${subStage.subStageName}`}
                        onClick={() => setHistorySubStage(subStage)}
                      >
                        <History className="size-4" />
                      </Button>
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={subStage.inUse}
                          title={
                            subStage.inUse
                              ? "This sub stage is used by one or more opportunities and can't be edited."
                              : undefined
                          }
                          aria-label={`Edit ${subStage.subStageName}`}
                          onClick={() => openEdit(subStage)}
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

      <SubStageFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        subStage={editingSubStage}
        allSubStages={subStages}
        stages={stages}
      />
      <SubStageHistoryDialog subStage={historySubStage} stages={stages} onClose={() => setHistorySubStage(null)} />
    </div>
  );
}
