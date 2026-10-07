/**
 * Placeholder in-memory store — SCAFFOLDING.
 * Ported alongside AppShell/DashboardContent/etc. so they type-check and
 * render with something on screen. Replace with real API-backed state
 * (@xts/api-client) before shipping.
 */
import { useSyncExternalStore } from "react";
import type {
  Activity,
  Approval,
  Customer,
  FinalResponse,
  HistoryEntry,
  Opportunity,
  PipelineRole,
  ProposalSection,
  RfpQuestionItem,
  RfpSection,
  Stage,
  StoreUser,
} from "./mock-data";

interface Notification {
  id: string;
  text: string;
  date: string;
  read: boolean;
}

interface CurrentUser {
  id: string;
  name: string;
  initials: string;
  team: string;
}

interface StoreState {
  currentUser: CurrentUser;
  role: Role;
  customers: Customer[];
  users: StoreUser[];
  opportunities: Opportunity[];
  questions: RfpQuestionItem[];
  sections: RfpSection[];
  proposalSections: ProposalSection[];
  activities: Activity[];
  approvals: Approval[];
  history: HistoryEntry[];
  notifications: Notification[];
}

// Deliberately no seed customers/opportunities — the Pipeline board starts
// empty (box structure only), populated solely through the New Opportunity
// flow. Users stay seeded: Step 1's "Owner" select needs someone to list.
const USERS: StoreUser[] = [
  { id: "u-sa", name: "User1", team: "Sales" },
  { id: "u-pm", name: "User2", team: "Sales" },
  { id: "u-dr", name: "User3", team: "Sales" },
  { id: "u-en", name: "User4", team: "Engineering" },
];

let state: StoreState = {
  currentUser: { id: "u1", name: "Bhushan Dixit", initials: "BD", team: "Enterprise West" },
  role: "Sales Manager",
  customers: [{ id: "cust-1", name: "Acme Corp", contactName: "Sam Rivera" }],
  users: [{ id: "u1", name: "Bhushan Dixit", team: "Enterprise West" }],
  opportunities: [],
  questions: [],
  sections: [],
  proposalSections: [],
  activities: [],
  approvals: [],
  history: [],
  notifications: [],
};

const listeners = new Set<() => void>();
function setState(patch: Partial<StoreState>) {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
function getSnapshot() {
  return state;
}

let idCounter = 1;
const nextId = (prefix: string) => `${prefix}-${idCounter++}`;

export function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function riskOf(opportunity: Opportunity): "soon" | "ok" {
  const days = (new Date(opportunity.expectedClose).getTime() - Date.now()) / 86_400_000;
  return days >= 0 && days <= 7 ? "soon" : "ok";
}

// Shared by submitAnswer and the Final Response readiness check — a single
// definition of "has an answer" so the two rules can't drift apart. A File
// Attachment question's answer is its attached document.
export function questionHasAnswer(question: RfpQuestionItem): boolean {
  return Boolean(question.answerValue?.trim()) || Boolean(question.answerValues?.length) || Boolean(question.answerDocument);
}

// Shared by getFinalResponseReadiness (a plain read) and generateFinalResponse
// (which must recompute it itself, never trusting the UI's own check) — one
// definition so the two can't drift apart.
function computeFinalResponseReadiness(
  questions: RfpQuestionItem[],
  opportunityId: string
): { ready: boolean; blockingIssues: string[] } {
  const active = questions.filter((q) => q.opportunityId === opportunityId && !q.withdrawn);
  const mandatory = active.filter((q) => q.mandatory);
  const unanswered = mandatory.filter((q) => !questionHasAnswer(q));
  const notApproved = mandatory.filter((q) => questionHasAnswer(q) && q.answerStatus !== "Approved");
  const unassigned = active.filter((q) => q.assignmentStatus === "Unassigned");
  const rework = active.filter((q) => q.answerStatus === "Rework Required");

  const blockingIssues: string[] = [];
  if (unanswered.length) blockingIssues.push(`${unanswered.length} mandatory question(s) not yet answered`);
  if (notApproved.length) blockingIssues.push(`${notApproved.length} mandatory question(s) answered but not yet approved`);
  if (unassigned.length) blockingIssues.push(`${unassigned.length} question(s) still unassigned`);
  if (rework.length) blockingIssues.push(`${rework.length} question(s) in rework`);
  return { ready: blockingIssues.length === 0, blockingIssues };
}

export function useStore() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  return {
    ...snapshot,
    visibleOpportunities: snapshot.opportunities,

    markAllRead() {
      setState({ notifications: snapshot.notifications.map((n) => ({ ...n, read: true })) });
    },
    userById(id: string) {
      return snapshot.users.find((u) => u.id === id);
    },
    addCustomer(entry: Omit<Customer, "id">): Customer {
      const created: Customer = { ...entry, id: nextId("cust") };
      setState({ customers: [...snapshot.customers, created] });
      return created;
    },
    updateCustomer(id: string, patch: Partial<Customer>) {
      setState({ customers: snapshot.customers.map((c) => (c.id === id ? { ...c, ...patch } : c)) });
    },
    addOpportunity(entry: Omit<Opportunity, "id">): Opportunity {
      const created: Opportunity = { ...entry, id: nextId("opp") };
      setState({ opportunities: [...snapshot.opportunities, created] });
      return created;
    },
    updateOpportunity(id: string, patch: Partial<Opportunity>) {
      setState({
        opportunities: snapshot.opportunities.map((o) => (o.id === id ? { ...o, ...patch } : o)),
      });
    },
    moveStage(id: string, stage: Stage) {
      setState({ opportunities: snapshot.opportunities.map((o) => (o.id === id ? { ...o, stage } : o)) });
    },
    addQuestion(entry: Omit<RfpQuestionItem, "id">): RfpQuestionItem {
      const created: RfpQuestionItem = { ...entry, id: nextId("q") };
      setState({ questions: [...snapshot.questions, created] });
      return created;
    },
    addQuestionsBulk(entries: Omit<RfpQuestionItem, "id">[]): RfpQuestionItem[] {
      const created = entries.map((entry) => ({ ...entry, id: nextId("q") }));
      setState({ questions: [...snapshot.questions, ...created] });
      return created;
    },
    updateQuestion(id: string, patch: Partial<RfpQuestionItem>) {
      setState({ questions: snapshot.questions.map((q) => (q.id === id ? { ...q, ...patch } : q)) });
    },
    bulkUpdateQuestions(ids: string[], patch: Partial<RfpQuestionItem>) {
      const idSet = new Set(ids);
      setState({ questions: snapshot.questions.map((q) => (idSet.has(q.id) ? { ...q, ...patch } : q)) });
    },
    withdrawQuestion(id: string) {
      setState({ questions: snapshot.questions.map((q) => (q.id === id ? { ...q, withdrawn: true } : q)) });
    },
    addSection(entry: Omit<RfpSection, "id">): RfpSection {
      const created: RfpSection = { ...entry, id: nextId("sec") };
      setState({ sections: [...snapshot.sections, created] });
      return created;
    },
    // Needed whenever more than one section must be created from a single
    // snapshot (e.g. mock extraction seeding several sections at once) —
    // calling addSection() repeatedly in the same tick would have each call
    // close over the same stale snapshot.sections and overwrite the others.
    addSectionsBulk(entries: Omit<RfpSection, "id">[]): RfpSection[] {
      const created = entries.map((entry) => ({ ...entry, id: nextId("sec") }));
      setState({ sections: [...snapshot.sections, ...created] });
      return created;
    },
    updateSection(id: string, patch: Partial<RfpSection>) {
      setState({ sections: snapshot.sections.map((s) => (s.id === id ? { ...s, ...patch } : s)) });
    },
    deleteSection(id: string) {
      setState({
        sections: snapshot.sections.filter((s) => s.id !== id),
        questions: snapshot.questions.map((q) => (q.sectionId === id ? { ...q, sectionId: undefined } : q)),
      });
    },
    assignQuestion(
      id: string,
      assignment: { assigneeId?: string; reviewerId?: string; dueDate?: string; notes?: string; team?: string }
    ) {
      const question = snapshot.questions.find((q) => q.id === id);
      if (!question) return;
      const wasAssigned = question.assignmentStatus !== "Unassigned";
      const assignee = snapshot.users.find((u) => u.id === assignment.assigneeId);
      setState({
        questions: snapshot.questions.map((q) =>
          q.id === id
            ? {
                ...q,
                assigneeId: assignment.assigneeId,
                reviewerId: assignment.reviewerId,
                dueDate: assignment.dueDate,
                assignmentNotes: assignment.notes,
                team: assignment.team,
                assignmentStatus: wasAssigned ? "Reassigned" : "Assigned",
                updatedAt: new Date().toISOString(),
              }
            : q
        ),
        history: [
          ...snapshot.history,
          {
            id: nextId("hist"),
            opportunityId: question.opportunityId,
            what: `Question #${question.number} ${wasAssigned ? "reassigned" : "assigned"} to ${assignee?.name ?? "someone"}`,
            date: new Date().toISOString().slice(0, 10),
          },
        ],
      });
    },
    bulkAssignQuestions(
      ids: string[],
      assignment: { assigneeId?: string; reviewerId?: string; dueDate?: string; notes?: string; team?: string }
    ) {
      const assignee = snapshot.users.find((u) => u.id === assignment.assigneeId);
      const idSet = new Set(ids);
      const newHistory = snapshot.questions
        .filter((q) => idSet.has(q.id))
        .map((q) => ({
          id: nextId("hist"),
          opportunityId: q.opportunityId,
          what: `Question #${q.number} ${q.assignmentStatus !== "Unassigned" ? "reassigned" : "assigned"} to ${assignee?.name ?? "someone"}`,
          date: new Date().toISOString().slice(0, 10),
        }));
      setState({
        questions: snapshot.questions.map((q) =>
          idSet.has(q.id)
            ? {
                ...q,
                assigneeId: assignment.assigneeId,
                reviewerId: assignment.reviewerId,
                dueDate: assignment.dueDate,
                assignmentNotes: assignment.notes,
                team: assignment.team,
                assignmentStatus: q.assignmentStatus !== "Unassigned" ? "Reassigned" : "Assigned",
                updatedAt: new Date().toISOString(),
              }
            : q
        ),
        history: [...snapshot.history, ...newHistory],
      });
    },
    saveAnswerDraft(
      id: string,
      draft: {
        answerValue?: string;
        answerValues?: string[];
        answerDocument?: RfpQuestionItem["answerDocument"];
        supportingEvidence?: RfpQuestionItem["supportingEvidence"];
        answererNotes?: string;
      }
    ) {
      setState({
        questions: snapshot.questions.map((q) =>
          q.id === id
            ? {
                ...q,
                ...draft,
                // Only the very first save moves it off "Not Started" — a
                // re-save after Submitted/Approved/Rework Required shouldn't
                // silently overwrite that status.
                answerStatus: q.answerStatus === "Not Started" ? "In Progress" : q.answerStatus,
                updatedAt: new Date().toISOString(),
              }
            : q
        ),
      });
    },
    submitAnswer(id: string): boolean {
      // Reads the live state, not the `snapshot` this closure was created
      // with — callers commonly call saveAnswerDraft() immediately before
      // this in the same handler, and that draft's answerValue wouldn't be
      // visible yet via the stale `snapshot`, incorrectly failing the
      // mandatory-answer check right after the user just entered one.
      const current = getSnapshot();
      const question = current.questions.find((q) => q.id === id);
      if (!question) return false;
      if (question.mandatory && !questionHasAnswer(question)) return false;

      const resubmittingAfterRework = question.answerStatus === "Rework Required";
      setState({
        questions: current.questions.map((q) =>
          q.id === id
            ? {
                ...q,
                answerStatus: "Submitted",
                answerVersion: resubmittingAfterRework ? q.answerVersion + 1 : q.answerVersion,
                updatedAt: new Date().toISOString(),
              }
            : q
        ),
        history: [
          ...current.history,
          {
            id: nextId("hist"),
            opportunityId: question.opportunityId,
            what: `Question #${question.number} answer submitted for review`,
            date: new Date().toISOString().slice(0, 10),
          },
        ],
      });
      return true;
    },
    reviewAnswer(id: string, decision: "Approved" | "Rework Required", comment?: string, reworkReason?: string) {
      const question = snapshot.questions.find((q) => q.id === id);
      if (!question) return;
      setState({
        questions: snapshot.questions.map((q) =>
          q.id === id
            ? {
                ...q,
                answerStatus: decision,
                answerReviewComment: comment || undefined,
                reworkReason: decision === "Rework Required" ? reworkReason : undefined,
                updatedAt: new Date().toISOString(),
              }
            : q
        ),
        history: [
          ...snapshot.history,
          {
            id: nextId("hist"),
            opportunityId: question.opportunityId,
            what:
              decision === "Approved"
                ? `Question #${question.number} answer approved`
                : `Question #${question.number} rework requested: ${reworkReason ?? ""}`,
            date: new Date().toISOString().slice(0, 10),
          },
        ],
      });
    },
    getFinalResponseReadiness(opportunityId: string): { ready: boolean; blockingIssues: string[] } {
      return computeFinalResponseReadiness(snapshot.questions, opportunityId);
    },
    generateFinalResponse(
      opportunityId: string,
      details: { title: string; description: string; exceptions?: string }
    ): { ok: boolean; blockingIssues: string[] } {
      // Never trusts the UI's own check — recomputed here, same as a real
      // resolver would before persisting.
      const { ready, blockingIssues } = computeFinalResponseReadiness(snapshot.questions, opportunityId);
      if (!ready) return { ok: false, blockingIssues };

      const opportunity = snapshot.opportunities.find((o) => o.id === opportunityId);
      if (!opportunity) return { ok: false, blockingIssues: ["Opportunity not found"] };

      const previousVersion = opportunity.finalResponse?.version ?? 0;
      const finalResponse: FinalResponse = {
        version: previousVersion + 1,
        title: details.title,
        description: details.description,
        exceptions: details.exceptions || undefined,
        preparedBy: snapshot.currentUser.name,
        generatedAt: new Date().toISOString(),
        status: "Generated",
      };
      setState({
        opportunities: snapshot.opportunities.map((o) => (o.id === opportunityId ? { ...o, finalResponse } : o)),
        history: [
          ...snapshot.history,
          {
            id: nextId("hist"),
            opportunityId,
            what: `Final response generated (v${finalResponse.version})`,
            date: new Date().toISOString().slice(0, 10),
          },
        ],
      });
      return { ok: true, blockingIssues: [] };
    },
    sendFinalResponseForApproval(opportunityId: string) {
      const opportunity = snapshot.opportunities.find((o) => o.id === opportunityId);
      if (!opportunity?.finalResponse || opportunity.finalResponse.status !== "Generated") return;
      setState({
        opportunities: snapshot.opportunities.map((o) =>
          o.id === opportunityId && o.finalResponse ? { ...o, finalResponse: { ...o.finalResponse, status: "Sent for approval" } } : o
        ),
        history: [
          ...snapshot.history,
          {
            id: nextId("hist"),
            opportunityId,
            what: "Final response sent for approval",
            date: new Date().toISOString().slice(0, 10),
          },
        ],
      });
    },
    addProposalSection(entry: Omit<ProposalSection, "id">): ProposalSection {
      const created: ProposalSection = { ...entry, id: nextId("psec") };
      setState({ proposalSections: [...snapshot.proposalSections, created] });
      return created;
    },
    addProposalSectionsBulk(entries: Omit<ProposalSection, "id">[]): ProposalSection[] {
      const created = entries.map((entry) => ({ ...entry, id: nextId("psec") }));
      setState({ proposalSections: [...snapshot.proposalSections, ...created] });
      return created;
    },
    updateProposalSection(id: string, patch: Partial<ProposalSection>) {
      setState({
        proposalSections: snapshot.proposalSections.map((s) =>
          s.id === id ? { ...s, ...patch, updatedAt: new Date().toISOString() } : s
        ),
      });
    },
    withdrawProposalSection(id: string) {
      setState({
        proposalSections: snapshot.proposalSections.map((s) => (s.id === id ? { ...s, withdrawn: true } : s)),
      });
    },
    addActivity(entry: Omit<Activity, "id">) {
      setState({ activities: [...snapshot.activities, { ...entry, id: nextId("act") }] });
    },
    decideApproval(id: string, status: Approval["status"], note: string) {
      const approval = snapshot.approvals.find((a) => a.id === id);
      setState({
        approvals: snapshot.approvals.map((a) => (a.id === id ? { ...a, status } : a)),
        history: approval
          ? [
              ...snapshot.history,
              {
                id: nextId("hist"),
                opportunityId: approval.opportunityId,
                what: note,
                date: new Date().toISOString().slice(0, 10),
              },
            ]
          : snapshot.history,
      });
    },
  };
}
