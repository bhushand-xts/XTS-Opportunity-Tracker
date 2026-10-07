import { useNavigate } from "react-router-dom";
import { ArrowRight, CalendarDays, CheckCircle2, Circle, FileText, LayoutGrid, Wallet } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  formatMoney,
  useSetPageTitle,
  useStore,
  type Opportunity,
} from "@xts/design-system";
import { PageHeader } from "../../components/PageHeader";
import { useProposalSections } from "../proposal-outline/proposalSection.mockHooks";
import { useRfpQuestionItems } from "../rfp-questions/rfpQuestionItem.mockHooks";

function SummaryTile({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Wallet }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </div>
      <p className="mt-1.5 text-lg font-semibold tracking-tight">{value}</p>
    </div>
  );
}

// AC8's "Opportunity details page" — a per-opportunity hub showing its RFP
// progress and linking back into the intake/respond/final-response workflow,
// reached from the sidebar's Opportunities group, a Pipeline card, an
// opportunity list row, or "Review & save opportunity" on Question
// Review/Proposal Outline. Reuses the same hooks those pages already use —
// no new progress logic, just a summary view over existing data.
export function OpportunityDetailPage({ opportunity }: { opportunity: Opportunity }) {
  useSetPageTitle(opportunity.name);
  const navigate = useNavigate();
  const { customers, users } = useStore();
  const { questions } = useRfpQuestionItems(opportunity.id);
  const { sections } = useProposalSections(opportunity.id);

  const customer = customers.find((c) => c.id === opportunity.customerId);
  const owner = users.find((u) => u.id === opportunity.ownerId);
  const isQuestionnaire = opportunity.rfpType === "Questionnaire";

  const intakeDone = !!opportunity.solicitation;

  const activeQuestions = questions.filter((q) => !q.withdrawn);
  const approvedQuestions = activeQuestions.filter((q) => q.answerStatus === "Approved").length;
  const questionsPercent = activeQuestions.length > 0 ? Math.round((approvedQuestions / activeQuestions.length) * 100) : 0;

  const activeSections = sections.filter((s) => !s.withdrawn);
  const finalSections = activeSections.filter((s) => s.status === "Final").length;
  const sectionsPercent = activeSections.length > 0 ? Math.round((finalSections / activeSections.length) * 100) : 0;

  const respondPercent = isQuestionnaire ? questionsPercent : sectionsPercent;
  const respondHasItems = isQuestionnaire ? activeQuestions.length > 0 : activeSections.length > 0;
  const finalResponseStatus = opportunity.finalResponse?.status;

  const steps: { label: string; done: boolean; to: string; percent?: number }[] = [
    { label: "Intake", done: intakeDone, to: `/opportunities/${opportunity.id}/intake` },
    {
      label: isQuestionnaire ? "Respond to questions" : "Proposal outline",
      done: respondHasItems && respondPercent === 100,
      to: isQuestionnaire
        ? `/opportunities/${opportunity.id}/questions`
        : `/opportunities/${opportunity.id}/proposal-outline`,
      percent: respondPercent,
    },
    {
      label: "Final response",
      done: finalResponseStatus === "Sent for approval",
      to: `/opportunities/${opportunity.id}/final-response`,
    },
  ];

  return (
    <div className="space-y-4 p-5">
      <PageHeader
        description={`${customer?.name ?? "No customer"} · ${opportunity.rfpType ?? "No RFP type"} · owner ${owner?.name ?? "—"}`}
        actions={
          <Button variant="outline" onClick={() => navigate("/opportunities/all")}>
            Back to all opportunities
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-semibold tracking-tight">{opportunity.name}</h1>
        {opportunity.rfpType && (
          <Badge variant={opportunity.rfpType === "Questionnaire" ? "default" : "secondary"}>{opportunity.rfpType}</Badge>
        )}
        <Badge variant="muted">{opportunity.stage}</Badge>
      </div>

      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryTile label="Value" value={formatMoney(opportunity.value)} icon={Wallet} />
        <SummaryTile label="Expected close" value={opportunity.expectedClose || "—"} icon={CalendarDays} />
        <SummaryTile label="RFP type" value={opportunity.rfpType ?? "—"} icon={FileText} />
        <SummaryTile label="Stage" value={opportunity.stage} icon={LayoutGrid} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">RFP workflow progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2.5">
          {steps.map((step) => (
            <div key={step.label} className="flex items-center justify-between gap-3 rounded-lg border p-3">
              <div className="flex items-center gap-2.5">
                {step.done ? (
                  <CheckCircle2 className="size-5 shrink-0 text-emerald-600" />
                ) : (
                  <Circle className="size-5 shrink-0 text-muted-foreground" />
                )}
                <div>
                  <p className="text-sm font-medium">{step.label}</p>
                  {step.percent !== undefined && (
                    <p className="text-xs text-muted-foreground">{step.percent}% complete</p>
                  )}
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => navigate(step.to)}>
                Open
                <ArrowRight className="ml-1.5 size-3.5" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
