import { Fragment, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  Eye,
  FileCheck2,
  FileText,
  Info,
  ListTree,
  MoreHorizontal,
  PenLine,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  User,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import type { ManagedUser, RfpQuestion } from "@xts/api-contracts";
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
  Avatar,
  AvatarFallback,
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
  type UploadedDocument,
} from "@xts/design-system";
import { PageHeader } from "../../components/PageHeader";
import { ProgressRing } from "../../components/ProgressRing";
import { OpportunityCreateStepper } from "../opportunity-create/OpportunityCreateStepper";
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
import { findRealUserName, realUserName, useRealUsers } from "./useRealUsers";
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

// Friendlier display labels for the same 5 answerStatus values — not a new
// piece of state, just relabeling (Approved -> "Answered", Submitted ->
// "Under review") to match the reference design. assignmentStatus isn't
// folded in here — the Owner column already shows "Unassigned" separately.
function answerStatusLabel(status: RfpQuestionItem["answerStatus"]): string {
  switch (status) {
    case "Approved":
      return "Answered";
    case "Submitted":
      return "Under review";
    case "In Progress":
      return "In progress";
    case "Rework Required":
      return "Rework required";
    case "Not Started":
    default:
      return "Not started";
  }
}

function answerStatusVariant(status: RfpQuestionItem["answerStatus"]): "success" | "destructive" | "warning" | "outline" | "muted" {
  switch (status) {
    case "Approved":
      return "success";
    case "Rework Required":
      return "destructive";
    case "Submitted":
      return "warning";
    case "In Progress":
      return "outline";
    case "Not Started":
    default:
      return "muted";
  }
}

function answerStatusIcon(status: RfpQuestionItem["answerStatus"]) {
  switch (status) {
    case "Approved":
      return CheckCircle2;
    case "Rework Required":
      return AlertTriangle;
    case "Submitted":
    case "In Progress":
      return Clock;
    case "Not Started":
    default:
      return Info;
  }
}

function answerStatusIconColor(status: RfpQuestionItem["answerStatus"]): string {
  switch (status) {
    case "Approved":
      return "text-emerald-600";
    case "Rework Required":
      return "text-destructive";
    case "Submitted":
    case "In Progress":
      return "text-amber-600";
    case "Not Started":
    default:
      return "text-muted-foreground";
  }
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

// A small fixed palette of soft avatar colors (same pastel style as the
// Badge success/warning/muted variants), picked deterministically per user id
// so the same owner always gets the same color across the table.
const AVATAR_PALETTE = [
  "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
  "bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300",
  "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
  "bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300",
];

function avatarColorClass(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}

// Read-only inline expand panel — shows the same response data
// AnswerWorkspacePage manages, without navigating away. No history array
// exists on RfpQuestionItem (answerVersion overwrites, doesn't append), so
// this only ever shows the single current response.
function ResponseSummary({ question, realUsers }: { question: RfpQuestionItem; realUsers: ManagedUser[] }) {
  if (question.answerStatus === "Not Started") {
    return <p className="px-2 text-sm text-muted-foreground">No response yet.</p>;
  }

  const assignee = realUsers.find((u) => String(u.id) === question.assigneeId);
  const responseText =
    question.answerValue || (question.answerValues && question.answerValues.length > 0 ? question.answerValues.join(", ") : "");
  const attachments = [question.answerDocument, question.supportingEvidence].filter(
    (doc): doc is UploadedDocument => Boolean(doc)
  );

  return (
    <div className="grid gap-4 px-2 sm:grid-cols-[1fr_200px_200px]">
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 text-sm font-medium">
          Latest response
          <Badge variant="outline">Version {question.answerVersion + 1}</Badge>
          <span className="text-xs font-normal text-muted-foreground">{new Date(question.updatedAt).toLocaleString()}</span>
        </div>
        <div className="whitespace-pre-wrap rounded-lg border bg-card p-3 text-sm text-muted-foreground">
          {responseText || "No response text."}
        </div>
      </div>
      <div className="text-sm">
        <p className="text-xs font-medium text-muted-foreground">Responded by</p>
        {assignee ? (
          <div className="mt-1 flex items-center gap-2">
            <Avatar className="size-7">
              <AvatarFallback className={`text-[10px] ${avatarColorClass(question.assigneeId!)}`}>
                {initialsOf(realUserName(assignee))}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate leading-tight">{realUserName(assignee)}</p>
              <p className="truncate text-xs leading-tight text-muted-foreground">{assignee.email}</p>
            </div>
          </div>
        ) : (
          <p className="mt-1 text-muted-foreground">Not yet assigned</p>
        )}
      </div>
      <div className="text-sm">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground">Attachments ({attachments.length})</p>
          {attachments.length > 0 && <span className="text-xs text-primary">View all</span>}
        </div>
        {attachments.length === 0 ? (
          <p className="mt-1 text-muted-foreground">No attachments</p>
        ) : (
          <ul className="mt-1.5 space-y-1.5">
            {attachments.map((doc) => (
              <li key={doc.id} className="flex items-center gap-2 rounded-lg border p-2">
                <div className="grid size-8 shrink-0 place-items-center rounded-md bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300">
                  <FileText className="size-4" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium">{doc.fileName}</p>
                  <p className="text-[11px] text-muted-foreground">{doc.fileSizeLabel}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
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
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const active = useMemo(() => questions.filter((q) => !q.withdrawn), [questions]);
  const existingSourceIds = useMemo(
    () => new Set(active.filter((q) => q.sourceQuestionId !== undefined).map((q) => q.sourceQuestionId!)),
    [active]
  );
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
    const assigneeId = values.assigneeId && values.assigneeId !== "none" ? values.assigneeId : undefined;
    void addQuestion({
      ...baseFields(values),
      number: nextNumber(),
      source: "Manual",
      reviewStatus: "Under review",
      assigneeId,
      assignmentStatus: assigneeId ? "Assigned" : "Unassigned",
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
    navigate(`/opportunities/${opportunity.id}`);
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
              Review &amp; save opportunity
            </Button>
          </>
        }
      />

      <OpportunityCreateStepper current={2} />

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-96">
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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10" />
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Question</TableHead>
                  <TableHead>Status</TableHead>
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
                    {group.rows.map((q) => {
                      const expanded = expandedId === q.id;
                      const StatusIcon = answerStatusIcon(q.answerStatus);
                      return (
                      <Fragment key={q.id}>
                      <TableRow
                        className="cursor-pointer"
                        onClick={() => setExpandedId(expanded ? null : q.id)}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox checked={selected.has(q.id)} onCheckedChange={() => toggleRow(q.id)} />
                        </TableCell>
                        <TableCell className="text-muted-foreground tabular-nums">{q.number}</TableCell>
                        <TableCell className="max-w-sm font-medium">
                          <div>
                            {q.questionText.length > QUESTION_PREVIEW_LENGTH ? (
                              <>
                                {q.questionText.slice(0, QUESTION_PREVIEW_LENGTH)}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setViewingQuestion(q);
                                  }}
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
                          </div>
                          <Badge variant="outline" className="mt-1 font-normal text-muted-foreground">
                            {q.category}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={answerStatusVariant(q.answerStatus)}>{answerStatusLabel(q.answerStatus)}</Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {(() => {
                            const ownerName = q.assigneeId ? findRealUserName(realUsers, q.assigneeId) : undefined;
                            return (
                              <div className="flex items-center gap-2">
                                <Avatar className="size-6">
                                  <AvatarFallback
                                    className={ownerName ? `text-[10px] ${avatarColorClass(q.assigneeId!)}` : "text-muted-foreground"}
                                  >
                                    {ownerName ? initialsOf(ownerName) : <User className="size-3" />}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="text-muted-foreground">
                                  {ownerName ?? "Unassigned"}
                                  {q.team && <div className="text-[10px] text-muted-foreground/80">{q.team}</div>}
                                </div>
                              </div>
                            );
                          })()}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {q.dueDate ? (
                            <span className="flex items-center gap-1.5">
                              <CalendarDays className="size-3.5" />
                              {q.dueDate}
                            </span>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <StatusIcon className={`size-3.5 ${answerStatusIconColor(q.answerStatus)}`} />
                            {q.answerStatus === "Not Started" ? "No response" : "1 response"}
                            {expanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                          </div>
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant={q.answerStatus === "Not Started" ? "default" : "outline"}
                              size="sm"
                              onClick={() => navigate(`/opportunities/${opportunity.id}/questions/${q.id}/answer`)}
                            >
                              {q.answerStatus === "Rework Required" ? (
                                <RotateCcw className="mr-1.5 size-3.5" />
                              ) : (
                                <PenLine className="mr-1.5 size-3.5" />
                              )}
                              {answerActionLabel(q.answerStatus)}
                            </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" aria-label={`Actions for question ${q.number}`}>
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
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
                          </div>
                        </TableCell>
                      </TableRow>
                      {expanded && (
                        <TableRow className="bg-muted/20 hover:bg-muted/20">
                          <TableCell />
                          <TableCell colSpan={COLUMNS - 1} className="py-3">
                            <ResponseSummary question={q} realUsers={realUsers} />
                          </TableCell>
                        </TableRow>
                      )}
                      </Fragment>
                      );
                    })}
                  </Fragment>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-center text-base">Question progress</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              <div className="flex flex-col items-center gap-2 text-center">
                <ProgressRing percent={completion} color="hsl(160 84% 39%)" size="lg" />
                <p className="text-xs text-muted-foreground">
                  {answerStatusCounts.Approved} of {active.length} questions answered.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-emerald-50 p-3 text-center dark:bg-emerald-950">
                  <p className="text-xl font-semibold text-emerald-700 dark:text-emerald-300">
                    {answerStatusCounts.Approved}
                  </p>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300">Answered</p>
                </div>
                <div className="rounded-lg bg-amber-50 p-3 text-center dark:bg-amber-950">
                  <p className="text-xl font-semibold text-amber-700 dark:text-amber-300">{answerStatusCounts.Submitted}</p>
                  <p className="text-xs text-amber-700 dark:text-amber-300">Under review</p>
                </div>
                <div className="rounded-lg bg-red-50 p-3 text-center dark:bg-red-950">
                  <p className="text-xl font-semibold text-red-700 dark:text-red-300">
                    {answerStatusCounts["Rework Required"]}
                  </p>
                  <p className="text-xs text-red-700 dark:text-red-300">Rework required</p>
                </div>
                <div className="rounded-lg bg-slate-100 p-3 text-center dark:bg-slate-800">
                  <p className="text-xl font-semibold text-slate-600 dark:text-slate-300">
                    {answerStatusCounts["Not Started"]}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-300">Not started</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
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
