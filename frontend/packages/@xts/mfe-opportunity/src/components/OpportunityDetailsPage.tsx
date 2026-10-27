import { QuestionViewer } from './QuestionViewer';
import { Calculator, CalendarClock, Check, ClipboardList, FileText, HelpCircle, History, LayoutGrid, Pencil, Wallet } from 'lucide-react';
import { useCallback } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Avatar, AvatarFallback, Badge, type BadgeProps, Button, Card, cn, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tabs, TabsContent, TabsList, TabsTrigger, useSetPageTitle } from '@xts/design-system';
import type { OpportunityDetail, OpportunityState } from '@xts/api-contracts';
import { useOpportunityService } from '../services/OpportunityService';
import { useResource } from '../hooks/useResource';
import { useUnsaved } from '../hooks/useUnsaved';
import { useOpportunityAccess } from '../hooks/useOpportunityAccess';
import { CONTEXT_FIELDS, money, RESPONSE_LABELS, rowAmount, STATE_LABELS, userLabel } from '../lib/workflow';
import { LEAD_SOURCES } from '../lib/opportunityOptions';
import { opportunityStatus } from '../lib/opportunityStatus';
import { avatarAccent, DetailDrawer, formatLocalDate, initials, Loading, Notice, Panel, PRIORITY_BADGE, Values } from './ui';
import { ClientValues } from './ClientPicker';
import { EstimationModule, ScopeModule, ScopeReadOnly } from './PreparationModules';
import { ResponseWorkspace } from './ResponseWorkspace';
import { ReviewActions } from './ReviewActions';
import { DocumentDownload } from './DocumentDownload';
import { OpportunityProgress } from './OpportunityProgress';

const STATUS_BADGE_VARIANT: Record<OpportunityState, BadgeProps['variant']> = {
  PREPARATION_PENDING: 'muted', IN_PROGRESS: 'info', SALES_REVIEW: 'warning', GATE1_PENDING: 'warning', GATE1_GO: 'success', SALES_REJECTED: 'critical', GATE1_NO_GO: 'critical',
};

function Activity({ opportunity: o }: { opportunity: OpportunityDetail }) {
  return <Panel title="Activity & decisions" description="Backend-recorded identity, timestamps and reviewed package revisions" tone="neutral"><div className="space-y-3">{o.activity?.map(event => <article key={event.id} className="border-b pb-3"><h3 className="font-semibold">{event.action}</h3><p className="mt-1 text-xs text-muted-foreground">{userLabel(event.actor)} · {new Date(event.at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST{event.packageRevision !== null ? ` · package v${event.packageRevision}` : ''}</p>{event.note && <p className="mt-3 whitespace-pre-wrap break-words text-sm">{event.note}</p>}</article>)}{!o.activity?.length && <p className="text-sm text-muted-foreground">No activity returned.</p>}</div></Panel>;
}
function Documents({ opportunity: o }: { opportunity: OpportunityDetail }) {
  return <Panel title="Documents" description="Files attached to this opportunity" tone="neutral"><Values values={[
    ['Source document', o.form.rfp.source ? <DocumentDownload document={o.form.rfp.source} opportunityId={o.id} /> : undefined],
  ]} /><p className="mt-3 text-sm text-muted-foreground">Additional document management is coming soon.</p></Panel>;
}
/** Compact solicitation card; the full reference fields, dates, sections and questions live in the drawer. */
function SolicitationPanel({ o }: { o: OpportunityDetail }) {
  const f = o.form, s = f.solicitation, d = f.dates;
  const itemsLabel = f.rfp.type === 'GENERIC' ? `${f.rfp.sections.length} proposal section${f.rfp.sections.length === 1 ? '' : 's'} selected` : `${f.rfp.questions.length} question${f.rfp.questions.length === 1 ? '' : 's'} added`;
  return <Panel title={`${f.rfp.type === 'GENERIC' ? 'Generic RFP' : f.rfp.type === 'QUESTIONNAIRE' ? 'Questionnaire' : 'RFP'} · solicitation`} tone="indigo" accentIcon className="opp-solicitation" headerRight={<DetailDrawer title="Solicitation details" description="Full procurement reference, important dates and proposal requirements.">
    <Panel title="Procurement reference" tone="indigo" accentIcon><Values values={[
      ['Solicitation / reference number', s.reference], ['Issuing agency / department', s.issuingAgency], ['Procurement contact', s.procurementContact], ['Submission method', s.submissionMethod], ...(f.rfp.type === 'QUESTIONNAIRE' ? [['Contract term', s.contractTerm], ['Incumbent vendor', s.incumbentVendor], ['Pre-bid meeting', s.preBidMeeting]] as [string, string][] : []), ['Source document', f.rfp.source ? <DocumentDownload document={f.rfp.source} opportunityId={o.id} /> : undefined],
    ]} /></Panel><div className="mt-4"><Panel title="Important dates & context" tone="amber" icon={CalendarClock} accentIcon><Values values={[
     ['Questions due', d.questionsDue], ['Submission deadline', d.submissionDeadline],
    ]} /></Panel></div>{f.rfp.type === 'GENERIC' && <div className="mt-4"><Panel title="Proposal format & sections" tone="teal" icon={FileText} accentIcon><Values values={[
      ['Submission format', f.rfp.submissionFormat === 'TECHNICAL_COST' ? 'Technical + Cost volumes' : 'Single combined proposal'], ['Evaluation basis', f.rfp.evaluation],
    ]} /><div className="mt-3"><h4 className="text-sm font-semibold">Required proposal sections</h4>{f.rfp.sections.length ? <ul className="mt-2 space-y-2 text-sm">{f.rfp.sections.map(section => <li key={section.key} className="flex items-start gap-2"><span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded border border-primary bg-primary text-primary-foreground"><Check className="size-3" aria-hidden="true" /><span className="sr-only">Selected:</span></span><span className="whitespace-pre-wrap break-words">{section.instructions || section.key}</span></li>)}</ul> : <p className="mt-2 text-sm text-muted-foreground">No proposal sections selected.</p>}</div></Panel></div>}
    {f.rfp.type === 'QUESTIONNAIRE' ? <QuestionViewer questions={f.rfp.questions} /> : <div className="mt-4"><Panel title="Added questions" tone="cyan" icon={HelpCircle} accentIcon>{f.rfp.questions.length ? <ol className="list-decimal space-y-2 pl-5 text-sm">{f.rfp.questions.map(question => <li key={question.id} className="whitespace-pre-wrap break-words">{question.text}</li>)}</ol> : <p className="text-sm text-muted-foreground">No questions added.</p>}</Panel></div>}
  </DetailDrawer>}><Values values={[
    ['Solicitation / reference number', s.reference], ['Issuing agency / department', s.issuingAgency], ['Submission method', s.submissionMethod], ['Questions due', d.questionsDue], ['Submission deadline', d.submissionDeadline], [f.rfp.type === 'GENERIC' ? 'Proposal sections' : 'Questions', itemsLabel],
  ]} /></Panel>;
}
/** Compact responses card; per-item owner/reviewer/answer detail lives in the drawer. */
function ResponsesPanel({ o }: { o: OpportunityDetail }) {
  const responses = o.responses ?? [];
  const approved = responses.filter(r => r.state === 'APPROVED' && r.approvedRevision === r.revision).length;
  return <Panel title="Responses & assigned work" tone="cyan" accentIcon headerRight={<DetailDrawer title="Responses & assigned work" description="Owner, reviewer and saved answer for each response item.">
    <Panel title="Response items" tone="cyan" icon={HelpCircle} accentIcon>
      {responses.map(response => <details key={response.id} className="opp-details mb-2"><summary>{response.title} · {RESPONSE_LABELS[response.state]}</summary><div className="p-3"><p className="text-xs text-muted-foreground">Owner: {userLabel(response.owner)} · Reviewer: {userLabel(response.reviewer)} · Due: {response.dueDate || 'Not provided'} · revision {response.revision}</p><p className="mt-3 whitespace-pre-wrap break-words text-sm">{response.answer || 'No response saved.'}</p></div></details>)}
      {!responses.length && <p className="text-sm text-muted-foreground">No response items.</p>}
    </Panel>
  </DetailDrawer>}><p className="text-sm">{responses.length} response item{responses.length === 1 ? '' : 's'} · {approved} current revision{approved === 1 ? '' : 's'} approved</p></Panel>;
}
/** Compact scope card; full summary text plus the styled Alignment/Risks lists (same look as the Scope tab) live in the drawer. */
function ScopeSummaryPanel({ o }: { o: OpportunityDetail }) {
  const scope = o.scope;
  return <Panel title="Saved scope summary" description={`Revision ${scope?.revision ?? 0}`} tone="rose" accentIcon headerRight={scope && <DetailDrawer title="Scope & assessment" description="Full scope summary, alignment and risk items as saved.">
    <Panel title="Scope" tone="violet" icon={ClipboardList} accentIcon><p className="whitespace-pre-wrap break-words text-sm">{scope.summary || 'Not provided'}</p></Panel><div className="mt-4"><ScopeReadOnly scope={scope} /></div>
  </DetailDrawer>}>{scope ? <><p className="line-clamp-3 whitespace-pre-wrap break-words text-sm">{scope.summary || 'Not provided'}</p><Values values={[['Alignment', `${scope.alignment.length} item${scope.alignment.length === 1 ? '' : 's'}`], ['Risks', `${scope.risks.length} item${scope.risks.length === 1 ? '' : 's'} · ${scope.risks.filter(item => item.severity === 'HIGH').length} high`]]} /></> : <p>Not provided</p>}</Panel>;
}
/** Compact estimation card; the full matrix row breakdown and assumptions live in the drawer. */
function EstimationSummaryPanel({ o }: { o: OpportunityDetail }) {
  const estimation = o.estimation;
  return <Panel title="Saved estimation summary" description={`Revision ${estimation?.revision ?? 0}`} tone="amber" accentIcon headerRight={estimation && <DetailDrawer title="Estimation matrix" description="Saved matrix rows and assumptions.">
    <Panel title="Matrix rows" tone="amber" icon={Calculator} accentIcon><div className="overflow-x-auto"><Table><TableHeader><TableRow>
      <TableHead className="px-2 py-1.5 text-[11px]">Work item</TableHead>
      <TableHead className="px-2 py-1.5 text-[11px] text-right">Hours</TableHead>
      <TableHead className="px-2 py-1.5 text-[11px] text-right">People</TableHead>
      <TableHead className="px-2 py-1.5 text-[11px] text-right">Rate / hr</TableHead>
      <TableHead className="px-2 py-1.5 text-[11px] text-right">Amount</TableHead>
    </TableRow></TableHeader><TableBody>{estimation.rows.map(row => { let amount = '—'; try { amount = money(rowAmount(row), o.currencyCode); } catch { /* shown as — */ } return <TableRow key={row.id}>
      <TableCell className="px-2 py-1.5 text-sm">{row.workItem}</TableCell>
      <TableCell className="px-2 py-1.5 text-right text-sm">{row.hours}</TableCell>
      <TableCell className="px-2 py-1.5 text-right text-sm">{row.people}</TableCell>
      <TableCell className="px-2 py-1.5 text-right text-sm">{money(row.hourlyRate, o.currencyCode)}</TableCell>
      <TableCell className="px-2 py-1.5 text-right text-sm font-medium">{amount}</TableCell>
    </TableRow>; })}</TableBody></Table></div></Panel>
    <div className="mt-4"><Panel title="Assumptions" tone="indigo" accentIcon><p className="whitespace-pre-wrap break-words text-sm">{estimation.assumptions || 'Not provided'}</p></Panel></div>
  </DetailDrawer>}>{estimation ? <><strong className="text-2xl">{money(estimation.total, o.currencyCode)}</strong><p className="mt-2 text-sm text-muted-foreground">{estimation.rows.length} saved matrix rows</p></> : <p>Not provided</p>}</Panel>;
}
function Overview({ opportunity: o, onSaved }: { opportunity: OpportunityDetail; onSaved: (value: OpportunityDetail) => void }) {
  const f = o.form;
  return <div className="opp-overview"><div className="space-y-3"><Panel title="Opportunity details" tone="violet" accentIcon><Values values={[
    ['Opportunity name', f.title], ['Client budget', money(o.estimatedValue, o.currencyCode)], ['Client budget (USD)', f.estimatedValueUsd ? money(f.estimatedValueUsd, 'USD') : ''], ['Currency', o.currencyCode], ['Service line', f.serviceLine === 'Other' ? f.serviceLineOther : f.serviceLine], ['Lead source', LEAD_SOURCES.find(source => source.id === f.leadSource)?.label ?? f.leadSource], ['Owner', userLabel(o.owner)], ['Priority', f.priority], ['Description', f.description],
  ]} /></Panel><Panel title="Client & contacts" tone="teal" accentIcon>{o.client ? <><h3 className="mb-3 font-semibold">{o.client.name}</h3><ClientValues client={o.client} /></> : <p>Not provided</p>}</Panel></div><div className="space-y-3">
    <SolicitationPanel o={o} />
    {o.visibleModules.includes('responses') && <ResponsesPanel o={o} />}
    {o.visibleModules.includes('scope') && <ScopeSummaryPanel o={o} />}
    {o.visibleModules.includes('estimation') && <EstimationSummaryPanel o={o} />}
    {o.salesRecommendation && <Panel title="Sales Head recommendation" tone="neutral" accentIcon><Values values={[
      ['Reviewed by', userLabel(o.salesRecommendation.actor)], ['Package revision', o.salesRecommendation.packageRevision], ['Recommendation', o.salesRecommendation.note],
    ]} /></Panel>}
  </div><aside className="space-y-3" aria-label="Opportunity approval and progress"><ReviewActions opportunity={o} onSaved={onSaved} /><OpportunityProgress opportunity={o} /></aside></div>;
}
type TabKey = 'overview' | 'qa' | 'scope' | 'estimation' | 'documents' | 'activity';
export function OpportunityDetailsPage({ review = false }: { review?: boolean }) {
  const { id } = useParams(), service = useOpportunityService(), access = useOpportunityAccess(), [params, setParams] = useSearchParams();
  const approvalView = review || access.approvals;
  const load = useCallback((signal: AbortSignal) => service.detail(id!, signal, approvalView ? 'REVIEW' : 'DETAILS'), [service, id, approvalView]);
  const resource = useResource(load, Boolean(id && access.view)), confirm = useUnsaved(false);
  const o = resource.data;
  useSetPageTitle(review ? 'Opportunity review' : 'Opportunity details');
  if (resource.loading) return <Loading />;
  if (resource.error) return <Notice error={resource.error} retry={resource.reload} />;
  if (!o) return <Notice error="This opportunity was not returned. It may have been removed or be outside your permitted scope." />;
  // All 6 tabs always show: no backend today sends per-role visibleModules
  // restrictions, so gating on that field only hid tabs without protecting
  // anything. Revisit once a real backend can send actual redaction.
  const tabs: { key: TabKey; label: string; icon: typeof LayoutGrid }[] = [
    { key: 'overview', label: 'Overview', icon: LayoutGrid },
    { key: 'qa', label: 'RFP Q&A', icon: HelpCircle },
    { key: 'scope', label: 'Scope & Assessment', icon: ClipboardList },
    { key: 'estimation', label: 'Estimate', icon: Calculator },
    { key: 'documents', label: 'Documents', icon: FileText },
    { key: 'activity', label: 'Activity', icon: History },
  ];
  const requested = params.get('tab') ?? 'overview', active = tabs.find(tab => tab.key === requested)?.key ?? tabs[0]?.key;
  if (!active) return <Notice title="Access restricted" error="No workspace modules are visible to your user." />;
  const ownerName = o.owner ? (o.owner.name || o.owner.email) : '';
  const statusLabel = opportunityStatus(o).substage ?? opportunityStatus(o).stage ?? STATE_LABELS[o.state];
  const responseCount = o.responses?.length ?? 0;
  return <div className="opp-page">
    <header className="opp-detail-heading">
      <Link to="/opportunity" className="opp-back">← Back to Pipeline</Link>
      <p className="opp-eyebrow">OPPORTUNITY · {o.number}</p>
      <div className="opp-heading opp-detail-title">
        <div className="opp-detail-identity">
          <div className="flex flex-wrap items-baseline gap-2"><h2>{o.title}</h2><span className="text-sm text-muted-foreground">{o.clientName || 'Client not provided'}</span></div>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <Badge variant={STATUS_BADGE_VARIANT[o.state] ?? 'outline'} className="gap-1.5"><span className="size-1.5 rounded-full bg-current" aria-hidden="true" />{statusLabel}</Badge>
            {PRIORITY_BADGE[o.form.priority] && <Badge variant={PRIORITY_BADGE[o.form.priority].variant}>{PRIORITY_BADGE[o.form.priority].label} priority</Badge>}
            <span className="text-xs text-muted-foreground">{review ? `Submitted package revision ${o.packageRevision ?? 'not submitted'}` : `Revision ${o.revision}`}</span>
          </div>
        </div>
        {access.edit && o.allowedActions.includes('EDIT') && <Button asChild><Link to={`/opportunity/${o.id}/edit`}><Pencil className="size-3.5" aria-hidden="true" />Edit opportunity</Link></Button>}
      </div>
    </header>
    <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
      <Card className="min-w-0 shadow-sm"><div className="flex items-start gap-3 p-3.5">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-indigo-50 text-indigo-600" aria-hidden="true"><Wallet className="size-4" /></span>
        <div className="min-w-0"><p className="text-xs text-muted-foreground">Client budget</p><strong className="block break-words text-base font-semibold">{money(o.estimatedValue, o.currencyCode)}</strong><p className="text-xs text-muted-foreground">Original currency · {o.currencyCode}</p></div>
      </div></Card>
      <Card className="min-w-0 shadow-sm"><div className="flex items-start gap-3 p-3.5">
        <Avatar className="size-9 shrink-0"><AvatarFallback className={cn('text-xs font-bold text-white', avatarAccent(ownerName || 'unassigned'))}>{ownerName ? initials(ownerName) : '—'}</AvatarFallback></Avatar>
        <div className="min-w-0"><p className="text-xs text-muted-foreground">Opportunity owner</p><strong className="block break-words text-base font-semibold">{userLabel(o.owner)}</strong><p className="text-xs text-muted-foreground">{o.owner?.roles?.length ? o.owner.roles.join(', ') : 'Role not provided'}</p></div>
      </div></Card>
      <Card className="min-w-0 shadow-sm"><div className="flex items-start gap-3 p-3.5">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-amber-50 text-amber-600" aria-hidden="true"><CalendarClock className="size-4" /></span>
        <div className="min-w-0"><p className="text-xs text-muted-foreground">Submission deadline</p><strong className="block break-words text-base font-semibold">{formatLocalDate(o.form.dates.submissionDeadline) ?? 'Not provided'}</strong><p className="text-xs text-muted-foreground">{o.form.solicitation.submissionTimezone || 'Timezone not set'} · Time not set</p></div>
      </div></Card>
    </div>
    <Tabs value={active} onValueChange={async tab => { if (await confirm()) setParams(tab === 'overview' ? {} : { tab }); }}><TabsList className="opp-tabs">{tabs.map(tab => <TabsTrigger key={tab.key} value={tab.key} className="gap-1.5"><tab.icon className="size-3.5" aria-hidden="true" />{tab.label}{tab.key === 'qa' && responseCount > 0 && <Badge variant="muted" size="sm">{responseCount}</Badge>}</TabsTrigger>)}</TabsList>{tabs.map(tab => <TabsContent key={tab.key} value={tab.key} className="mt-3">{tab.key === 'overview' ? <Overview opportunity={o} onSaved={resource.setData} /> : tab.key === 'estimation' ? <EstimationModule opportunity={o} onSaved={resource.setData} readOnly={review} /> : tab.key === 'scope' ? <ScopeModule opportunity={o} onSaved={resource.setData} readOnly={review} /> : tab.key === 'documents' ? <Documents opportunity={o} /> : tab.key === 'qa' ? (approvalView ? <Panel title="Saved response details" tone="indigo"><p className="mb-3 text-sm text-muted-foreground">Read-only reviewed package v{o.packageRevision}</p>{o.responses?.map(r => <article key={r.id} className="mb-3 rounded-lg border p-3"><h3 className="font-semibold">{r.title}</h3><p className="mt-1 text-xs text-muted-foreground">{RESPONSE_LABELS[r.state]} · revision {r.revision} · Owner {userLabel(r.owner)} · Reviewer {userLabel(r.reviewer)}</p><p className="mt-3 whitespace-pre-wrap break-words text-sm">{r.answer || 'No response saved.'}</p></article>)}</Panel> : <ResponseWorkspace opportunity={o} onSaved={resource.setData} />) : <Activity opportunity={o} />}</TabsContent>)}</Tabs>
  </div>;
}
