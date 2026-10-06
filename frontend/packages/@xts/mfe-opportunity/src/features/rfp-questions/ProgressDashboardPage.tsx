import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, BarChart3 } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Label,
  PRIORITIES,
  Progress,
  QUESTION_TYPES,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  useSetPageTitle,
  type Opportunity,
  type RfpQuestionItem,
} from "@xts/design-system";
import { PageHeader } from "../../components/PageHeader";
import { SectionTitle } from "../opportunity-create/SectionTitle";
import { useRfpQuestionItems } from "./rfpQuestionItem.mockHooks";
import { useRfpSections } from "./rfpSection.mockHooks";
import { findRealUserName, realUserName, useRealUsers } from "./useRealUsers";

const ALL = "all";
const UNSECTIONED_GROUP = "unsectioned";

function isOverdue(q: RfpQuestionItem): boolean {
  if (!q.dueDate || q.answerStatus === "Approved") return false;
  return q.dueDate < new Date().toISOString().slice(0, 10);
}

export function ProgressDashboardPage({ opportunity }: { opportunity: Opportunity }) {
  useSetPageTitle("Progress dashboard");
  const navigate = useNavigate();
  const { questions } = useRfpQuestionItems(opportunity.id);
  const { sections } = useRfpSections(opportunity.id);
  const { users } = useRealUsers();

  const [sectionFilter, setSectionFilter] = useState(ALL);
  const [assigneeFilter, setAssigneeFilter] = useState(ALL);
  const [reviewerFilter, setReviewerFilter] = useState(ALL);
  const [priorityFilter, setPriorityFilter] = useState(ALL);
  const [typeFilter, setTypeFilter] = useState(ALL);
  const [overdueOnly, setOverdueOnly] = useState(false);

  const filtered = useMemo(() => {
    return questions.filter((q) => {
      if (q.withdrawn) return false;
      if (sectionFilter !== ALL) {
        const matchesSection = sectionFilter === UNSECTIONED_GROUP ? !q.sectionId : q.sectionId === sectionFilter;
        if (!matchesSection) return false;
      }
      if (assigneeFilter !== ALL && q.assigneeId !== assigneeFilter) return false;
      if (reviewerFilter !== ALL && q.reviewerId !== reviewerFilter) return false;
      if (priorityFilter !== ALL && q.priority !== priorityFilter) return false;
      if (typeFilter !== ALL && q.type !== typeFilter) return false;
      if (overdueOnly && !isOverdue(q)) return false;
      return true;
    });
  }, [questions, sectionFilter, assigneeFilter, reviewerFilter, priorityFilter, typeFilter, overdueOnly]);

  const metrics = useMemo(() => {
    const total = filtered.length;
    const unassigned = filtered.filter((q) => q.assignmentStatus === "Unassigned").length;
    const assigned = total - unassigned;
    const inProgress = filtered.filter((q) => q.answerStatus === "In Progress").length;
    const submitted = filtered.filter((q) => q.answerStatus === "Submitted").length;
    const approved = filtered.filter((q) => q.answerStatus === "Approved").length;
    const rework = filtered.filter((q) => q.answerStatus === "Rework Required").length;
    const overdue = filtered.filter(isOverdue).length;
    const completion = total > 0 ? Math.round((approved / total) * 100) : 0;
    return { total, unassigned, assigned, inProgress, submitted, approved, rework, overdue, completion };
  }, [filtered]);

  const sectionBreakdown = useMemo(() => {
    const groups = [
      ...sections.map((s) => ({ id: s.id, name: s.name, rows: filtered.filter((q) => q.sectionId === s.id) })),
      { id: UNSECTIONED_GROUP, name: "Unsectioned", rows: filtered.filter((q) => !q.sectionId) },
    ];
    return groups
      .map((g) => ({
        ...g,
        total: g.rows.length,
        approved: g.rows.filter((q) => q.answerStatus === "Approved").length,
        overdue: g.rows.filter(isOverdue).length,
      }))
      .filter((g) => g.total > 0);
  }, [sections, filtered]);

  const assigneeBreakdown = useMemo(() => {
    const ids = Array.from(new Set(filtered.map((q) => q.assigneeId).filter((id): id is string => Boolean(id))));
    return ids
      .map((id) => {
        const rows = filtered.filter((q) => q.assigneeId === id);
        return {
          id,
          name: findRealUserName(users, id) ?? "Unknown",
          total: rows.length,
          approved: rows.filter((q) => q.answerStatus === "Approved").length,
          overdue: rows.filter(isOverdue).length,
        };
      })
      .sort((a, b) => b.total - a.total);
  }, [filtered, users]);

  const tiles: { label: string; value: number | string; tone?: "destructive" | "success" }[] = [
    { label: "Total", value: metrics.total },
    { label: "Unassigned", value: metrics.unassigned },
    { label: "Assigned", value: metrics.assigned },
    { label: "In progress", value: metrics.inProgress },
    { label: "Submitted", value: metrics.submitted },
    { label: "Approved", value: metrics.approved, tone: "success" },
    { label: "Rework required", value: metrics.rework, tone: metrics.rework > 0 ? "destructive" : undefined },
    { label: "Overdue", value: metrics.overdue, tone: metrics.overdue > 0 ? "destructive" : undefined },
    { label: "Completion", value: `${metrics.completion}%`, tone: "success" },
  ];

  return (
    <div className="space-y-4 p-5">
      <PageHeader
        description={`${opportunity.name} · Progress dashboard`}
        actions={
          <Button variant="outline" size="sm" onClick={() => navigate(`/opportunities/${opportunity.id}/questions`)}>
            Back to review
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Select value={sectionFilter} onValueChange={setSectionFilter}>
          <SelectTrigger className="w-44">
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
        <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All owners" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All owners</SelectItem>
            {users.map((u) => (
              <SelectItem key={u.id} value={String(u.id)}>
                {realUserName(u)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={reviewerFilter} onValueChange={setReviewerFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All reviewers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All reviewers</SelectItem>
            {users.map((u) => (
              <SelectItem key={u.id} value={String(u.id)}>
                {realUserName(u)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All priorities</SelectItem>
            {PRIORITIES.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All types</SelectItem>
            {QUESTION_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2 pl-2">
          <Switch id="overdue-only" checked={overdueOnly} onCheckedChange={setOverdueOnly} />
          <Label htmlFor="overdue-only" className="text-sm font-normal">
            Overdue only
          </Label>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {tiles.map((tile) => (
          <Card key={tile.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{tile.label}</p>
              <p
                className={`mt-1 text-2xl font-semibold ${
                  tile.tone === "destructive" ? "text-destructive" : tile.tone === "success" ? "text-emerald-600" : ""
                }`}
              >
                {tile.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              <SectionTitle icon={BarChart3}>By section</SectionTitle>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {sectionBreakdown.length === 0 && (
              <p className="text-sm text-muted-foreground">No questions match the current filters.</p>
            )}
            {sectionBreakdown.map((s) => (
              <div key={s.id} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{s.name}</span>
                  <span className="text-muted-foreground">
                    {s.approved}/{s.total} approved
                    {s.overdue > 0 && <span className="ml-2 text-destructive">· {s.overdue} overdue</span>}
                  </span>
                </div>
                <Progress value={s.total > 0 ? (s.approved / s.total) * 100 : 0} />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              <SectionTitle icon={AlertTriangle}>By owner</SectionTitle>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {assigneeBreakdown.length === 0 && <p className="text-sm text-muted-foreground">No one is assigned yet.</p>}
            {assigneeBreakdown.map((a) => (
              <div key={a.id} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{a.name}</span>
                  <span className="text-muted-foreground">
                    {a.approved}/{a.total} approved
                    {a.overdue > 0 && <span className="ml-2 text-destructive">· {a.overdue} overdue</span>}
                  </span>
                </div>
                <Progress value={a.total > 0 ? (a.approved / a.total) * 100 : 0} />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
