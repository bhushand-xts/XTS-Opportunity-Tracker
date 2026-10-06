import { Fragment, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart3,
  Copy,
  Eye,
  FileCheck2,
  ListChecks,
  ListTree,
  MoreHorizontal,
  PenLine,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import type { RfpQuestion } from "@xts/api-contracts";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  ANSWER_STATUSES,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
  RFP_QUESTION_CATEGORIES,
  QUESTION_SOURCES,
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
  useSetPageTitle,
  type Opportunity,
  type RfpQuestionItem,
} from "@xts/design-system";
import { PageHeader } from "../../components/PageHeader";
import { ProgressRing } from "../../components/ProgressRing";
import { RfpStatsBanner } from "../../components/RfpStatsBanner";
import { AddFromMasterDialog } from "./AddFromMasterDialog";
import { AssignQuestionDialog } from "./AssignQuestionDialog";
import { ManageSectionsDialog } from "./ManageSectionsDialog";
import { MoveToSectionDialog } from "./MoveToSectionDialog";
import { QuestionFormDialog } from "./QuestionFormDialog";
import { parseAnswerOptions, type QuestionFormValues } from "./questionForm.schema";
import {
  useAddRfpQuestionItem,
  useAddRfpQuestionItemsBulk,
  useAssignQuestion,
  useBulkAssignQuestions,
  useBulkUpdateRfpQuestionItems,
  useRfpQuestionItems,
  useUpdateRfpQuestionItem,
  useWithdrawRfpQuestionItem,
  type AssignmentInput,
} from "./rfpQuestionItem.mockHooks";
import { useFinalResponseReadiness } from "./rfpFinalResponse.mockHooks";
import { useRfpSections } from "./rfpSection.mockHooks";
import { findRealUserName, useRealUsers } from "./useRealUsers";
import { ViewQuestionDialog } from "./ViewQuestionDialog";
import { ViewSourceDialog } from "./ViewSourceDialog";

const ALL = "all";
const UNSECTIONED_GROUP = "unsectioned";
const COLUMNS = 8;
const QUESTION_PREVIEW_LENGTH = 60;

// Once a question has been through the answer flow, "Answer" stops being an
// accurate label for the same menu item — it reads differently depending on
// whether there's a draft to continue, something to re-do after rework, or
// an already-submitted/approved answer to look back at.
function answerActionLabel(status: RfpQuestionItem["answerStatus"]): string {
  switch (status) {
    case "In Progress":
      return "Continue answer";
    case "Submitted":
      return "View/edit answer";
    case "Approved":
      return "View answer";
    case "Rework Required":
      return "Re-answer";
    case "Not Started":
    default:
      return "Answer";
  }
}

export function QuestionReviewPage({ opportunity }: { opportunity: Opportunity }) {
  useSetPageTitle("Question review");
  const navigate = useNavigate();
  const { questions } = useRfpQuestionItems(opportunity.id);
  const { sections } = useRfpSections(opportunity.id);
  const { users: realUsers } = useRealUsers();
  const { ready: readyToFinish, blockingIssues } = useFinalResponseReadiness(opportunity.id);
  const [addQuestion] = useAddRfpQuestionItem();
  const [addQuestionsBulk] = useAddRfpQuestionItemsBulk();
  const [updateQuestion] = useUpdateRfpQuestionItem();
  const [bulkUpdateQuestions] = useBulkUpdateRfpQuestionItems();
  const [withdrawQuestion] = useWithdrawRfpQuestionItem();
  const [assignQuestion] = useAssignQuestion();
  const [bulkAssignQuestions] = useBulkAssignQuestions();

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState(ALL);
  const [sectionFilter, setSectionFilter] = useState(ALL);
  const [sourceFilter, setSourceFilter] = useState(ALL);
  const [mandatoryFilter, setMandatoryFilter] = useState(ALL);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<RfpQuestionItem | null>(null);
  const [masterDialogOpen, setMasterDialogOpen] = useState(false);
  const [moveSectionOpen, setMoveSectionOpen] = useState(false);
  const [manageSectionsOpen, setManageSectionsOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assigningIds, setAssigningIds] = useState<string[]>([]);
  const [viewingQuestion, setViewingQuestion] = useState<RfpQuestionItem | null>(null);
  const [viewingSource, setViewingSource] = useState<RfpQuestionItem | null>(null);
  const [withdrawing, setWithdrawing] = useState<RfpQuestionItem | null>(null);

  const active = useMemo(() => questions.filter((q) => !q.withdrawn), [questions]);
  const existingSourceIds = useMemo(
    () => new Set(active.filter((q) => q.sourceQuestionId !== undefined).map((q) => q.sourceQuestionId!)),
    [active]
  );
  const assignedCount = useMemo(() => active.filter((q) => q.assignmentStatus !== "Unassigned").length, [active]);
  const underReviewCount = useMemo(() => active.filter((q) => q.reviewStatus === "Under review").length, [active]);

  const answerStatusCounts = useMemo(() => {
    const counts = Object.fromEntries(ANSWER_STATUSES.map((s) => [s, 0])) as Record<RfpQuestionItem["answerStatus"], number>;
    active.forEach((q) => counts[q.answerStatus]++);
    return counts;
  }, [active]);
  const completion = active.length > 0 ? Math.round((answerStatusCounts.Approved / active.length) * 100) : 0;

  const visible = useMemo(() => {
    const text = search.trim().toLowerCase();
    return active.filter((q) => {
      if (text && !q.questionText.toLowerCase().includes(text)) return false;
      if (categoryFilter !== ALL && q.category !== categoryFilter) return false;
      if (sectionFilter !== ALL && (q.sectionId ?? UNSECTIONED_GROUP) !== sectionFilter) return false;
      if (sourceFilter !== ALL && q.source !== sourceFilter) return false;
      if (mandatoryFilter === "mandatory" && !q.mandatory) return false;
      if (mandatoryFilter === "optional" && q.mandatory) return false;
      return true;
    });
  }, [active, search, categoryFilter, sectionFilter, sourceFilter, mandatoryFilter]);

  const groups = useMemo(() => {
    const bySection = sections.map((s) => ({ section: s, rows: visible.filter((q) => q.sectionId === s.id) }));
    const unsectioned = visible.filter((q) => !q.sectionId || !sections.some((s) => s.id === q.sectionId));
    return [...bySection, { section: null, rows: unsectioned }].filter((g) => g.rows.length > 0);
  }, [sections, visible]);

  function nextNumber() {
    return active.length > 0 ? Math.max(...active.map((q) => q.number)) + 1 : 1;
  }

  function baseFields(values: QuestionFormValues) {
    const now = new Date().toISOString();
    return {
      opportunityId: opportunity.id,
      questionText: values.questionText,
      type: values.type as RfpQuestionItem["type"],
      category: values.category,
      sectionId: values.sectionId || undefined,
      mandatory: values.mandatory,
      priority: values.priority as RfpQuestionItem["priority"],
      reviewerNotes: values.reviewerNotes || undefined,
      answerOptions: parseAnswerOptions(values.answerOptionsText).length
        ? parseAnswerOptions(values.answerOptionsText)
        : undefined,
      assignmentStatus: "Unassigned" as const,
      answerStatus: "Not Started" as const,
      answerVersion: 0,
      withdrawn: false,
      createdAt: now,
      updatedAt: now,
    };
  }

  function handleCreate(values: QuestionFormValues) {
    void addQuestion({
      ...baseFields(values),
      number: nextNumber(),
      source: "Manual",
      reviewStatus: "Under review",
    });
  }

  function handleUpdate(id: string, values: QuestionFormValues) {
    void updateQuestion(id, {
      questionText: values.questionText,
      type: values.type as RfpQuestionItem["type"],
      category: values.category,
      sectionId: values.sectionId || undefined,
      mandatory: values.mandatory,
      priority: values.priority as RfpQuestionItem["priority"],
      reviewerNotes: values.reviewerNotes || undefined,
      answerOptions: parseAnswerOptions(values.answerOptionsText).length
        ? parseAnswerOptions(values.answerOptionsText)
        : undefined,
      updatedAt: new Date().toISOString(),
    });
  }

  function handleAddFromMaster(masterQuestions: RfpQuestion[]) {
    const now = new Date().toISOString();
    void addQuestionsBulk(
      masterQuestions.map((mq, index) => ({
        opportunityId: opportunity.id,
        number: nextNumber() + index,
        questionText: mq.question,
        type: "Long Text",
        category: RFP_QUESTION_CATEGORIES[0],
        mandatory: true,
        priority: "Medium",
        source: "Generic Master",
        sourceQuestionId: mq.id,
        reviewStatus: "Under review",
        assignmentStatus: "Unassigned",
        answerStatus: "Not Started",
        answerVersion: 0,
        withdrawn: false,
        createdAt: now,
        updatedAt: now,
      }))
    );
  }

  function handleDuplicate(question: RfpQuestionItem) {
    const now = new Date().toISOString();
    void addQuestion({
      ...question,
      opportunityId: opportunity.id,
      number: nextNumber(),
      questionText: `${question.questionText} (copy)`,
      reviewStatus: "Under review",
      assigneeId: undefined,
      reviewerId: undefined,
      dueDate: undefined,
      assignmentNotes: undefined,
      answerValue: undefined,
      answerValues: undefined,
      answerDocument: undefined,
      supportingEvidence: undefined,
      answererNotes: undefined,
      answerStatus: "Not Started",
      answerVersion: 0,
      answerReviewComment: undefined,
      reworkReason: undefined,
      assignmentStatus: "Unassigned",
      withdrawn: false,
      createdAt: now,
      updatedAt: now,
    });
  }

  function handleMoveToSection(sectionId: string | undefined) {
    void bulkUpdateQuestions([...selected], { sectionId, updatedAt: new Date().toISOString() });
    setSelected(new Set());
  }

  function handleBulkMandatory(mandatory: boolean) {
    void bulkUpdateQuestions([...selected], { mandatory, updatedAt: new Date().toISOString() });
    setSelected(new Set());
  }

  function openAssign(ids: string[]) {
    setAssigningIds(ids);
    setAssignOpen(true);
  }

  function handleAssign(assignment: AssignmentInput) {
    if (assigningIds.length === 1) void assignQuestion(assigningIds[0], assignment);
    else void bulkAssignQuestions(assigningIds, assignment);
    setSelected(new Set());
  }

  function confirmWithdraw() {
    if (!withdrawing) return;
    void withdrawQuestion(withdrawing.id);
    setWithdrawing(null);
  }

  function handleSaveAndFinish() {
    if (!readyToFinish) {
      toast.error(`Can't finish yet — ${blockingIssues.join(" · ")}.`);
      return;
    }
    navigate("/opportunities");
  }

  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-4 p-5">
      <PageHeader
        description={`${opportunity.name} · structured RFP · review, assign, and answer each question`}
        actions={
          <>
            <Button
              variant="outline"
              disabled={active.length === 0}
              onClick={() => navigate(`/opportunities/${opportunity.id}/final-response`)}
            >
              <FileCheck2 className="mr-2 size-4" />
              Final response
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" aria-label="More actions">
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setManageSectionsOpen(true)}>
                  <ListTree className="mr-2 size-4" />
                  Manage sections
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setMasterDialogOpen(true)}>
                  <Plus className="mr-2 size-4" />
                  Add from Generic Master
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus className="mr-2 size-4" />
              Add question
            </Button>
            <Button variant="outline" onClick={handleSaveAndFinish}>
              Save &amp; finish
            </Button>
          </>
        }
      />

      <RfpStatsBanner
        icon={ListChecks}
        title={`Questions for ${opportunity.document?.fileName ?? "this RFP"}`}
        subtitle="Assign owners, answer, and review each question before submission."
        stats={[
          { label: "Questions", value: active.length },
          { label: "Assigned", value: assignedCount },
          { label: "Under review", value: underReviewCount },
          { label: "Deadline", value: opportunity.solicitation?.submissionDeadline || "—" },
        ]}
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search questions..."
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All categories</SelectItem>
            {RFP_QUESTION_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sectionFilter} onValueChange={setSectionFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All sections</SelectItem>
            <SelectItem value={UNSECTIONED_GROUP}>Unsectioned</SelectItem>
            {sections.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All sources</SelectItem>
            {QUESTION_SOURCES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={mandatoryFilter} onValueChange={setMandatoryFilter}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Mandatory & optional</SelectItem>
            <SelectItem value="mandatory">Mandatory only</SelectItem>
            <SelectItem value="optional">Optional only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-accent/50 px-4 py-2.5 text-sm">
          <span className="font-medium">{selected.size} selected</span>
          <Button size="sm" variant="outline" onClick={() => openAssign([...selected])}>
            <UserPlus className="mr-2 size-3.5" />
            Assign
          </Button>
          <Button size="sm" variant="outline" onClick={() => setMoveSectionOpen(true)}>
            Move to section
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleBulkMandatory(true)}>
            Mark mandatory
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleBulkMandatory(false)}>
            Mark optional
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive"
            onClick={() => {
              selected.forEach((id) => void withdrawQuestion(id));
              setSelected(new Set());
            }}
          >
            <Trash2 className="mr-2 size-3.5" />
            Withdraw selected
          </Button>
          <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setSelected(new Set())}>
            Clear
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10" />
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Question</TableHead>
                  <TableHead>Review status</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Due date</TableHead>
                  <TableHead>Answer</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {active.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={COLUMNS} className="h-24 text-center text-sm text-muted-foreground">
                      No questions yet. Add from the Generic Master, add one manually, or extract from a document.
                    </TableCell>
                  </TableRow>
                )}
                {active.length > 0 && groups.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={COLUMNS} className="h-24 text-center text-sm text-muted-foreground">
                      No questions match your current filters.
                    </TableCell>
                  </TableRow>
                )}
                {groups.map((group) => (
                  <Fragment key={group.section?.id ?? UNSECTIONED_GROUP}>
                    {(sections.length > 0 || group.section) && (
                      <TableRow className="bg-muted/40 hover:bg-muted/40">
                        <TableCell colSpan={COLUMNS} className="py-2 text-xs font-semibold">
                          {group.section ? group.section.name : "Unsectioned"}
                          <span className="ml-2 font-normal text-muted-foreground">
                            {group.rows.length} question{group.rows.length === 1 ? "" : "s"}
                            {group.section?.ownerId && ` · Owner: ${findRealUserName(realUsers, group.section.ownerId) ?? "—"}`}
                            {group.section?.dueDate && ` · Due ${group.section.dueDate}`}
                          </span>
                        </TableCell>
                      </TableRow>
                    )}
                    {group.rows.map((q) => (
                      <TableRow key={q.id}>
                        <TableCell>
                          <Checkbox checked={selected.has(q.id)} onCheckedChange={() => toggleRow(q.id)} />
                        </TableCell>
                        <TableCell className="text-muted-foreground tabular-nums">{q.number}</TableCell>
                        <TableCell className="max-w-sm font-medium">
                          {q.questionText.length > QUESTION_PREVIEW_LENGTH ? (
                            <>
                              {q.questionText.slice(0, QUESTION_PREVIEW_LENGTH)}
                              <button
                                type="button"
                                onClick={() => setViewingQuestion(q)}
                                aria-label={`View full text of question ${q.number}`}
                                className="ml-0.5 inline-flex rounded-full bg-blue-50 px-1.5 text-blue-700 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300 dark:hover:bg-blue-900"
                              >
                                ...
                              </button>
                            </>
                          ) : (
                            q.questionText
                          )}
                          {q.mandatory && <span className="ml-0.5 text-destructive">*</span>}
                        </TableCell>
                        <TableCell>
                          <Badge variant={q.reviewStatus === "Reviewed" ? "success" : "muted"}>{q.reviewStatus}</Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {q.assigneeId ? (findRealUserName(realUsers, q.assigneeId) ?? "—") : "Unassigned"}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">{q.dueDate ?? "—"}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              q.answerStatus === "Approved"
                                ? "success"
                                : q.answerStatus === "Rework Required"
                                  ? "destructive"
                                  : q.answerStatus === "Not Started"
                                    ? "muted"
                                    : "outline"
                            }
                          >
                            {q.answerStatus}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" aria-label={`Actions for question ${q.number}`}>
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => navigate(`/opportunities/${opportunity.id}/questions/${q.id}/answer`)}
                              >
                                {q.answerStatus === "Rework Required" ? (
                                  <RotateCcw className="mr-2 size-4" />
                                ) : (
                                  <PenLine className="mr-2 size-4" />
                                )}
                                {answerActionLabel(q.answerStatus)}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openAssign([q.id])}>
                                <UserPlus className="mr-2 size-4" />
                                Assign
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setViewingQuestion(q)}>
                                <Eye className="mr-2 size-4" />
                                View details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditing(q);
                                  setFormOpen(true);
                                }}
                              >
                                <Pencil className="mr-2 size-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDuplicate(q)}>
                                <Copy className="mr-2 size-4" />
                                Duplicate
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setViewingSource(q)}>
                                <Eye className="mr-2 size-4" />
                                View source
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive" onClick={() => setWithdrawing(q)}>
                                <Trash2 className="mr-2 size-4" />
                                Withdraw
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </Fragment>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="space-y-4 lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Question progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <ProgressRing percent={completion} />
                <p className="text-xs text-muted-foreground">
                  {answerStatusCounts.Approved} of {active.length} questions approved.
                </p>
              </div>
              <div className="mt-4 space-y-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span className="size-2.5 rounded-sm bg-emerald-600" />
                  Approved — {answerStatusCounts.Approved}
                </div>
                <div className="flex items-center gap-2">
                  <span className="size-2.5 rounded-sm bg-primary" />
                  Submitted — {answerStatusCounts.Submitted}
                </div>
                <div className="flex items-center gap-2">
                  <span className="size-2.5 rounded-sm bg-amber-500" />
                  In progress — {answerStatusCounts["In Progress"]}
                </div>
                <div className="flex items-center gap-2">
                  <span className="size-2.5 rounded-sm bg-destructive" />
                  Rework required — {answerStatusCounts["Rework Required"]}
                </div>
                <div className="flex items-center gap-2">
                  <span className="size-2.5 rounded-sm bg-muted" />
                  Not started — {answerStatusCounts["Not Started"]}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-4 w-full"
                disabled={active.length === 0}
                onClick={() => navigate(`/opportunities/${opportunity.id}/progress`)}
              >
                <BarChart3 className="mr-2 size-3.5" />
                View full dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <QuestionFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        opportunityId={opportunity.id}
        question={editing}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
      />
      <AddFromMasterDialog
        open={masterDialogOpen}
        onOpenChange={setMasterDialogOpen}
        existingSourceIds={existingSourceIds}
        onAdd={handleAddFromMaster}
      />
      <MoveToSectionDialog
        open={moveSectionOpen}
        onOpenChange={setMoveSectionOpen}
        opportunityId={opportunity.id}
        count={selected.size}
        onApply={handleMoveToSection}
      />
      <ManageSectionsDialog open={manageSectionsOpen} onOpenChange={setManageSectionsOpen} opportunityId={opportunity.id} />
      <AssignQuestionDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        count={assigningIds.length}
        submissionDeadline={opportunity.solicitation?.submissionDeadline}
        onAssign={handleAssign}
      />
      <ViewQuestionDialog
        question={viewingQuestion}
        reviewerName={viewingQuestion?.reviewerId ? findRealUserName(realUsers, viewingQuestion.reviewerId) : undefined}
        onClose={() => setViewingQuestion(null)}
      />
      <ViewSourceDialog question={viewingSource} onClose={() => setViewingSource(null)} />

      <AlertDialog open={withdrawing !== null} onOpenChange={(open) => !open && setWithdrawing(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Withdraw this question?</AlertDialogTitle>
            <AlertDialogDescription>
              It stays on record for history but is removed from the active review list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmWithdraw}>
              Withdraw
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
