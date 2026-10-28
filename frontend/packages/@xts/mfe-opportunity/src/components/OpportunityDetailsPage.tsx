import { QuestionViewer } from './QuestionViewer';
import { Calculator, CalendarClock, Check, ClipboardList, FileText, HelpCircle, History, LayoutGrid, Pencil } from 'lucide-react';
import { useCallback } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Badge, type BadgeProps, Button, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tabs, TabsContent, TabsList, TabsTrigger, useSetPageTitle } from '@xts/design-system';
import type { OpportunityDetail, OpportunityState } from '@xts/api-contracts';
import { useOpportunityService } from '../services/OpportunityService';
import { useResource } from '../hooks/useResource';
import { useUnsaved } from '../hooks/useUnsaved';
import { useOpportunityAccess } from '../hooks/useOpportunityAccess';
import { CONTEXT_FIELDS, money, RESPONSE_LABELS, rowAmount, STATE_LABELS, userLabel } from '../lib/workflow';
import { LEAD_SOURCES } from '../lib/opportunityOptions';
import { opportunityStatus } from '../lib/opportunityStatus';
import { DetailDrawer, formatLocalDate, initials, Loading, Notice, Panel, PRIORITY_BADGE, Values } from './ui';
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
  return <Panel title="Activity & decisions" description="Backend-recorded identity, timestamps and reviewed package revisions" tone="neutral"><div className="space-y-3">{o.activity?.map(event => <article key={event.id} className="border-b pb-3"><h3 className="text-sm font-semibold">{event.action}</h3><p className="mt-1 text-xs text-muted-foreground">{userLabel(event.actor)} · {new Date(event.at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST{event.packageRevision !== null ? ` · package v${event.packageRevision}` : ''}</p>{event.note && <p className="mt-3 whitespace-pre-wrap break-words text-sm">{event.note}</p>}</article>)}{!o.activity?.length && <p className="text-sm text-muted-foreground">No activity returned.</p>}</div></Panel>;
}
function Documents({ opportunity: o }: { opportunity: OpportunityDetail }) {
  return <Panel title="Documents" description="Files attached to this opportunity" tone="neutral"><Values values={[
    ['Source document', o.form.rfp.source ? <DocumentDownload document={o.form.rfp.source} opportunityId={o.id} /> : undefined],
  ]} /><p className="mt-3 text-sm text-muted-foreground">Additional document management is coming soon.</p></Panel>;
}
function SolicitationPanel({ opportunity: o }: { opportunity: OpportunityDetail }) {
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
  return <Panel title="Saved scope summary" tone="rose" accentIcon headerRight={<div className="flex shrink-0 items-center gap-2">
    <Badge variant="muted" size="sm">Revision {scope?.revision ?? 0}</Badge>
    {scope && <DetailDrawer title="Scope & assessment" description="Full scope summary, alignment and risk items as saved.">
      <Panel title="Scope" tone="violet" icon={ClipboardList} accentIcon><p className="whitespace-pre-wrap break-words text-sm">{scope.summary || 'Not provided'}</p></Panel><div className="mt-4"><ScopeReadOnly scope={scope} /></div>
    </DetailDrawer>}
  </div>}>{scope ? <><p className="line-clamp-3 whitespace-pre-wrap break-words text-sm">{scope.summary || 'Not provided'}</p><Values values={[['Alignment', `${scope.alignment.length} item${scope.alignment.length === 1 ? '' : 's'}`], ['Risks', `${scope.risks.length} item${scope.risks.length === 1 ? '' : 's'} · ${scope.risks.filter(item => item.severity === 'HIGH').length} high`]]} /></> : <p className="text-sm">Not provided</p>}</Panel>;
}
/** Splits a formatted money string ("₹5,81,564.10") at its last decimal point so the cents can
 * render smaller than the whole-number part — purely a display split of the same formatted value. */
function splitMoney(formatted: string): [string, string] {
  const i = formatted.lastIndexOf('.');
  return i === -1 ? [formatted, ''] : [formatted.slice(0, i), formatted.slice(i)];
}
/** Compact estimation card; the full matrix row breakdown and assumptions live in the drawer. */
function EstimationSummaryPanel({ o }: { o: OpportunityDetail }) {
  const estimation = o.estimation;
  const [whole, cents] = estimation ? splitMoney(money(estimation.total, o.currencyCode)) : ['', ''];
  return <Panel title="Saved estimation summary" tone="amber" accentIcon headerRight={<Badge variant="muted" size="sm" className="shrink-0">Revision {estimation?.revision ?? 0}</Badge>}>
    {estimation ? <>
      <p className="flex items-center gap-2 text-xs text-muted-foreground">Estimate total<Badge variant="warning" size="sm">{o.currencyCode}</Badge></p>
      <p className="mb-4 mt-1 text-3xl font-bold leading-tight tracking-tight tabular-nums">{whole}<span className="text-base font-normal text-muted-foreground">{cents}</span></p>
      <div className="flex items-center justify-between gap-3 border-t pt-3 text-sm">
        <span><strong className="text-base">{estimation.rows.length}</strong> <span className="text-muted-foreground">work items</span></span>
        <DetailDrawer title="Estimation matrix" description="Saved matrix rows and assumptions." trigger={<button type="button" className="text-sm font-semibold text-amber-700 hover:underline dark:text-amber-400">View estimate →</button>}>
          <Panel title="Matrix rows" tone="amber" icon={Calculator} accentIcon><div className="overflow-x-auto"><Table><TableHeader><TableRow>
            <TableHead className="px-2 py-1.5 text-xs">Work item</TableHead>
            <TableHead className="px-2 py-1.5 text-xs text-right">Hours</TableHead>
            <TableHead className="px-2 py-1.5 text-xs text-right">People</TableHead>
            <TableHead className="px-2 py-1.5 text-xs text-right">Rate / hr</TableHead>
            <TableHead className="px-2 py-1.5 text-xs text-right">Amount</TableHead>
          </TableRow></TableHeader><TableBody>{estimation.rows.map(row => { let amount = '—'; try { amount = money(rowAmount(row), o.currencyCode); } catch { /* shown as — */ } return <TableRow key={row.id}>
            <TableCell className="px-2 py-1.5 text-sm">{row.workItem}</TableCell>
            <TableCell className="px-2 py-1.5 text-right text-sm">{row.hours}</TableCell>
            <TableCell className="px-2 py-1.5 text-right text-sm">{row.people}</TableCell>
            <TableCell className="px-2 py-1.5 text-right text-sm">{money(row.hourlyRate, o.currencyCode)}</TableCell>
            <TableCell className="px-2 py-1.5 text-right text-sm font-medium">{amount}</TableCell>
          </TableRow>; })}</TableBody></Table></div></Panel>
          <div className="mt-4"><Panel title="Assumptions" tone="indigo" accentIcon><p className="whitespace-pre-wrap break-words text-sm">{estimation.assumptions || 'Not provided'}</p></Panel></div>
        </DetailDrawer>
      </div>
    </> : <p className="text-sm">Not provided</p>}
  </Panel>;
}
function Overview({
  opportunity: o,
}: {
  opportunity: OpportunityDetail;
}) {
  const f = o.form;

  return (
    <div className="opp-overview">
      <div className="space-y-3">
        <Panel title="Opportunity details" tone="violet" accentIcon headerRight={<DetailDrawer title="Opportunity details" description="Full opportunity record.">
          <Panel title="Opportunity details" tone="violet" accentIcon><Values values={[
            ['Opportunity name', f.title], ['Client budget', money(o.estimatedValue, o.currencyCode)], ['Client budget (USD)', f.estimatedValueUsd ? money(f.estimatedValueUsd, 'USD') : ''], ['Currency', o.currencyCode], ['Service line', f.serviceLine === 'Other' ? f.serviceLineOther : f.serviceLine], ['Lead source', LEAD_SOURCES.find(source => source.id === f.leadSource)?.label ?? f.leadSource], ['Owner', userLabel(o.owner)], ['Priority', f.priority], ['Description', f.description],
          ]} /></Panel>
        </DetailDrawer>}>
          <dl className="grid grid-cols-1 gap-x-4 gap-y-3 text-sm min-[400px]:grid-cols-2">
            <div className="col-span-2">
              <dt className="text-xs text-muted-foreground">Client budget</dt>
              <dd className="mt-0.5 flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                <strong className="text-lg font-semibold">{money(o.estimatedValue, o.currencyCode)}</strong>
                {f.estimatedValueUsd ? <span className="text-xs text-muted-foreground">USD equivalent · {money(f.estimatedValueUsd, 'USD')}</span> : null}
              </dd>
            </div>
            <div className="col-span-2"><dt className="text-xs text-muted-foreground">Service line</dt><dd className="mt-0.5">{f.serviceLine === 'Other' ? f.serviceLineOther : f.serviceLine}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Owner</dt><dd className="mt-0.5">{userLabel(o.owner)}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Lead source</dt><dd className="mt-0.5">{LEAD_SOURCES.find(source => source.id === f.leadSource)?.label ?? f.leadSource}</dd></div>
          </dl>
        </Panel>

        <Panel title="Client & contacts" tone="teal" accentIcon headerRight={o.client && <DetailDrawer title="Client & contacts" description="Full client record and contacts."><Panel title="Client & contacts" tone="teal" accentIcon><ClientValues client={o.client} /></Panel></DetailDrawer>}>
          {o.client ? (
            <>
              <p className="text-sm font-semibold">{o.client.name}</p>
              <p className="text-xs text-muted-foreground">{[o.client.accountTypeName, o.client.industryName].filter(Boolean).join(' · ')}</p>
              <p className="mt-2 text-sm">{[[o.client.streetAddress, o.client.city, o.client.stateProvince].filter(Boolean).join(', '), o.client.country].filter(Boolean).join(' · ')}</p>
              <div className="mt-3 flex items-start gap-2 border-t pt-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-full opp-panel-icon-teal text-xs font-semibold" aria-hidden="true">{initials(o.client.primaryContact.name || '—')}</span>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Primary contact</p>
                  <p className="text-sm font-medium">{o.client.primaryContact.name}{o.client.primaryContact.title ? ` · ${o.client.primaryContact.title}` : ''}</p>
                  <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                    {o.client.primaryContact.email && <a className="text-xs text-primary hover:underline" href={`mailto:${o.client.primaryContact.email}`}>{o.client.primaryContact.email}</a>}
                    {o.client.primaryContact.phone && <a className="text-xs text-primary hover:underline" href={`tel:${o.client.primaryContact.phone}`}>{o.client.primaryContact.phone}</a>}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm">Not provided</p>
          )}
        </Panel>
      </div>

      <div className="space-y-3">
        <SolicitationPanel opportunity={o} />

        {Boolean(o.responses?.length) && <ResponsesPanel o={o} />}

        {o.visibleModules.includes('scope') && (
          <ScopeSummaryPanel o={o} />
        )}

        {o.visibleModules.includes('estimation') && (
          <EstimationSummaryPanel o={o} />
        )}

        {o.salesRecommendation && (
          <Panel title="Sales Head recommendation" tone="teal">
            <Values
              values={[
                ['Reviewed by', userLabel(o.salesRecommendation.actor)],
                ['Package revision', o.salesRecommendation.packageRevision],
                ['Recommendation', o.salesRecommendation.note],
              ]}
            />
          </Panel>
        )}
      </div>
    </div>
  );
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
  // Keep the full workflow visible, with preparation content available after
  // the CEO's Go/No-Go approval moves the opportunity into estimation.
  const awaitingEstimation = o.stageId === 1 || o.stageId === 2;
  const tabs: { key: TabKey; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'qa', label: 'RFP Q&A' },
    { key: 'scope', label: 'Scope & Assessment' },
    { key: 'estimation', label: 'Estimate' },
    { key: 'documents', label: 'Documents' },
    { key: 'activity', label: 'Activity' },
  ];
  const requested = params.get('tab') ?? 'overview', active = tabs.find(tab => tab.key === requested)?.key ?? tabs[0]?.key;
  if (!active) return <Notice title="Access restricted" error="No workspace modules are visible to your user." />;
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
    <Tabs value={active} onValueChange={async tab => { if (await confirm()) setParams(tab === 'overview' ? {} : { tab }); }}>
      <TabsList className="opp-tabs">{tabs.map(tab => <TabsTrigger key={tab.key} value={tab.key}>{tab.label}</TabsTrigger>)}</TabsList>
      <div className="opp-detail-layout mt-3">
      <div className="opp-detail-workspace">
      {tabs.map(tab => <TabsContent key={tab.key} value={tab.key} className="mt-0">
        {tab.key !== 'overview' && awaitingEstimation ? <div role="status" className="rounded-lg border bg-background px-6 py-8 text-center">
          <h3 className="text-sm font-semibold">Available after CEO approval</h3>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground">{tab.label} will be available once the CEO approves this opportunity and it enters the Solution/Scoping Estimation (Engineering) stage.</p>
        </div> : tab.key === 'overview' ? <Overview opportunity={o} />
          : tab.key === 'estimation' ? <EstimationModule opportunity={o} onSaved={resource.setData} readOnly={review} showActions={false} />
          : tab.key === 'scope' ? <ScopeModule key={o.id} opportunity={o} onSaved={resource.setData} readOnly={review} />
          : tab.key === 'documents' ? <Documents opportunity={o} />
          : tab.key === 'qa' ? <ResponseWorkspace opportunity={o} onSaved={resource.setData} />
          : <Activity opportunity={o} />}
      </TabsContent>)}
      </div>
      <aside className="opp-detail-sidebar" aria-label="Opportunity approval and progress">
        <ReviewActions opportunity={o} onSaved={resource.setData} />
        <OpportunityProgress opportunity={o} />
      </aside>
      </div>
    </Tabs>
  </div>;
}
