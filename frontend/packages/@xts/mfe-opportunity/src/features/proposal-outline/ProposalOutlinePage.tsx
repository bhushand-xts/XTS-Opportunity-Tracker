import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileStack, MoreHorizontal, PenLine, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
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
  CardHeader,
  CardTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  PROPOSAL_SECTION_STATUSES,
  useSetPageTitle,
  type Opportunity,
  type ProposalSection,
  type ProposalSectionStatus,
} from "@xts/design-system";
import { PageHeader } from "../../components/PageHeader";
import { ProgressRing } from "../../components/ProgressRing";
import { RfpStatsBanner } from "../../components/RfpStatsBanner";
import { realUserName, useRealUsers } from "../rfp-questions/useRealUsers";
import { ProposalSectionDialog } from "./ProposalSectionDialog";
import type { ProposalSectionFormValues } from "./proposalSection.schema";
import {
  useAddProposalSection,
  useProposalSections,
  useUpdateProposalSection,
  useWithdrawProposalSection,
} from "./proposalSection.mockHooks";

const UNASSIGNED = "none";
const COLUMNS = 6;

function statusBadgeVariant(status: ProposalSectionStatus): "success" | "default" | "warning" | "muted" {
  switch (status) {
    case "Final":
      return "success";
    case "Drafting":
      return "default";
    case "Assigned":
      return "warning";
    case "Not Started":
    default:
      return "muted";
  }
}

export function ProposalOutlinePage({ opportunity }: { opportunity: Opportunity }) {
  useSetPageTitle("Proposal outline");
  const navigate = useNavigate();
  const { sections } = useProposalSections(opportunity.id);
  const { users } = useRealUsers();
  const [addSection] = useAddProposalSection();
  const [updateSection] = useUpdateProposalSection();
  const [withdrawSection] = useWithdrawProposalSection();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ProposalSection | null>(null);
  const [withdrawing, setWithdrawing] = useState<ProposalSection | null>(null);

  const active = useMemo(() => sections.filter((s) => !s.withdrawn), [sections]);
  const drafted = active.filter((s) => s.status === "Drafting" || s.status === "Final").length;
  const assignedCount = active.filter((s) => Boolean(s.assigneeId)).length;

  const statusCounts = useMemo(() => {
    const counts: Record<ProposalSectionStatus, number> = { "Not Started": 0, Assigned: 0, Drafting: 0, Final: 0 };
    active.forEach((s) => counts[s.status]++);
    return counts;
  }, [active]);

  const completion = active.length > 0 ? Math.round((statusCounts.Final / active.length) * 100) : 0;

  // This path has no answer/review workflow to gate on (see
  // PROPOSAL_OUTLINE_CONTRACT.md), so "ready to finish" is the closest
  // equivalent: every section drafted through to Final, with an owner.
  const blockingIssues = useMemo(() => {
    const notFinal = active.length - statusCounts.Final;
    const unassigned = active.length - assignedCount;
    const issues: string[] = [];
    if (notFinal > 0) issues.push(`${notFinal} section(s) not yet marked Final`);
    if (unassigned > 0) issues.push(`${unassigned} section(s) still unassigned`);
    return issues;
  }, [active.length, statusCounts.Final, assignedCount]);
  const readyToFinish = blockingIssues.length === 0;

  function nextNumber() {
    return active.length > 0 ? Math.max(...active.map((s) => s.number)) + 1 : 1;
  }

  function handleCreate(values: ProposalSectionFormValues) {
    const now = new Date().toISOString();
    void addSection({
      opportunityId: opportunity.id,
      number: nextNumber(),
      title: values.title,
      volume: values.volume,
      content: values.content || undefined,
      status: "Not Started",
      withdrawn: false,
      createdAt: now,
      updatedAt: now,
    });
  }

  function handleUpdate(id: string, values: ProposalSectionFormValues) {
    void updateSection(id, {
      title: values.title,
      volume: values.volume,
      content: values.content || undefined,
      updatedAt: new Date().toISOString(),
    });
  }

  function confirmWithdraw() {
    if (!withdrawing) return;
    void withdrawSection(withdrawing.id);
    setWithdrawing(null);
  }

  function handleSaveAndFinish() {
    if (!readyToFinish) {
      toast.error(`Can't finish yet — ${blockingIssues.join(" · ")}.`);
      return;
    }
    navigate("/opportunities");
  }

  return (
    <div className="space-y-4 p-5">
      <PageHeader
        description={`${opportunity.name} · generic RFP · build the proposal section by section`}
        actions={
          <>
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus className="mr-2 size-4" />
              Add section
            </Button>
            <Button variant="outline" onClick={handleSaveAndFinish}>
              Save &amp; finish
            </Button>
          </>
        }
      />

      <RfpStatsBanner
        icon={FileStack}
        title={`Proposal sections for ${opportunity.document?.fileName ?? "this RFP"}`}
        subtitle="Draft each section, assign owners, and track progress to the deadline."
        stats={[
          { label: "Drafted", value: `${drafted}/${active.length}` },
          { label: "Assigned", value: assignedCount },
          { label: "Page limit", value: opportunity.proposalRequirements?.pageLimit || "—" },
          { label: "Deadline", value: opportunity.solicitation?.submissionDeadline || "—" },
        ]}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Section</TableHead>
                  <TableHead>Volume</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {active.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={COLUMNS} className="h-24 text-center text-sm text-muted-foreground">
                      No sections yet. Add one, or go back and check a section in the intake form.
                    </TableCell>
                  </TableRow>
                )}
                {active.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="text-muted-foreground tabular-nums">{s.number}</TableCell>
                    <TableCell className="max-w-sm font-medium">{s.title}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{s.volume}</TableCell>
                    <TableCell>
                      <Select
                        value={s.assigneeId ?? UNASSIGNED}
                        onValueChange={(v) => void updateSection(s.id, { assigneeId: v === UNASSIGNED ? undefined : v })}
                      >
                        <SelectTrigger className="h-8 w-40 text-xs">
                          <SelectValue placeholder="Owner" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                          {users.map((u) => (
                            <SelectItem key={u.id} value={String(u.id)}>
                              {realUserName(u)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={s.status}
                        onValueChange={(v) => void updateSection(s.id, { status: v as ProposalSectionStatus })}
                      >
                        <SelectTrigger className="h-8 w-32 border-none bg-transparent p-0 shadow-none focus:ring-0 [&>svg]:hidden">
                          <SelectValue>
                            <Badge variant={statusBadgeVariant(s.status)}>{s.status}</Badge>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {PROPOSAL_SECTION_STATUSES.map((status) => (
                            <SelectItem key={status} value={status}>
                              {status}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label={`Actions for section ${s.number}`}>
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setEditing(s);
                              setFormOpen(true);
                            }}
                          >
                            <PenLine className="mr-2 size-4" />
                            Draft / edit
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => setWithdrawing(s)}>
                            <Trash2 className="mr-2 size-4" />
                            Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="space-y-4 lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Proposal progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <ProgressRing percent={completion} />
                <p className="text-xs text-muted-foreground">
                  {statusCounts.Final} of {active.length} sections drafted or final.
                </p>
              </div>
              <div className="mt-4 space-y-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span className="size-2.5 rounded-sm bg-emerald-600" />
                  Final — {statusCounts.Final}
                </div>
                <div className="flex items-center gap-2">
                  <span className="size-2.5 rounded-sm bg-primary" />
                  Drafting — {statusCounts.Drafting}
                </div>
                <div className="flex items-center gap-2">
                  <span className="size-2.5 rounded-sm bg-amber-500" />
                  Assigned, pending — {statusCounts.Assigned}
                </div>
                <div className="flex items-center gap-2">
                  <span className="size-2.5 rounded-sm bg-muted" />
                  Not started — {statusCounts["Not Started"]}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Submission</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Format</span>
                <span>{opportunity.proposalRequirements?.submissionFormat ?? "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Evaluation</span>
                <span>{opportunity.proposalRequirements?.evaluationBasis || "—"}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <ProposalSectionDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        section={editing}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
      />

      <AlertDialog open={withdrawing !== null} onOpenChange={(open) => !open && setWithdrawing(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this section?</AlertDialogTitle>
            <AlertDialogDescription>
              It stays on record for history but is removed from the active outline.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmWithdraw}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
