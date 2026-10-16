import { STAGE_NAMES, SUBSTAGE_NAMES } from '../lib/opportunityStages';
import { useCallback } from 'react';
import { Check } from 'lucide-react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Button, Tabs, TabsContent, TabsList, TabsTrigger, useSetPageTitle } from '@xts/design-system';
import type { Module, OpportunityDetail } from '@xts/api-contracts';
import { useOpportunityService } from '../services/OpportunityService';
import { useResource } from '../hooks/useResource';
import { useUnsaved } from '../hooks/useUnsaved';
import { useOpportunityAccess } from '../hooks/useOpportunityAccess';
import { money, RESPONSE_LABELS, SCOPE_FIELDS, STATE_LABELS, userLabel } from '../lib/workflow';
import { LEAD_SOURCES } from '../lib/opportunityOptions';
import { Loading, Notice, Panel, Status, Values } from './ui';
import { ClientValues } from './ClientPicker';
import { EstimationModule, ScopeModule } from './PreparationModules';
import { ResponseWorkspace } from './ResponseWorkspace';
import { ReviewActions } from './ReviewActions';
import { DocumentDownload } from './DocumentDownload';

function Activity({ opportunity: o }: { opportunity: OpportunityDetail }) {
  return <Panel title="Activity & decisions" description="Backend-recorded identity, timestamps and reviewed package revisions" tone="neutral"><div className="space-y-3">{o.activity?.map(event => <article key={event.id} className="border-b pb-3"><h3 className="font-semibold">{event.action}</h3><p className="mt-1 text-xs text-muted-foreground">{userLabel(event.actor)} · {new Date(event.at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST{event.packageRevision !== null ? ` · package v${event.packageRevision}` : ''}</p>{event.note && <p className="mt-3 whitespace-pre-wrap break-words text-sm">{event.note}</p>}</article>)}{!o.activity?.length && <p className="text-sm text-muted-foreground">No activity returned.</p>}</div></Panel>;
}
function Progress({ opportunity: o }: { opportunity: OpportunityDetail }) {
  const assigned = o.approvalAssignees?.length ? o.approvalAssignees.map(userLabel).join(', ') : userLabel(o.responsible);
  const stages = ['SALES_REVIEW', 'GATE1_PENDING', 'GATE1_GO'] as const;
  const index = stages.findIndex(state => state === o.state), closed = o.state === 'SALES_REJECTED' || o.state === 'GATE1_NO_GO';
  const timeline = [1, 2, 3, ...(o.stageId != null && o.stageId > 3 ? Array.from({ length: Math.min(o.stageId, 6) - 3 }, (_, i) => i + 4) : []), ...(o.stageId != null && o.stageId > 6 ? [o.stageId] : [])];
  return <Panel title="Opportunity progress" tone="violet"><Status state={o.state} opportunity={o} />{o.stageId != null ? <ol className="opp-progress">{[...timeline].reverse().map(id => <li key={id} className={id === o.stageId ? 'current' : id < o.stageId! && o.stageId! < 7 ? 'complete' : ''}><span>{id < o.stageId! && o.stageId! < 7 ? String.fromCharCode(10003) : id}</span><div><strong>{STAGE_NAMES[id]}{id === o.stageId && o.subStageId != null ? ` - ${SUBSTAGE_NAMES[o.subStageId] ?? o.subStageId}` : ''}</strong><small>{id === o.stageId ? 'Current stage' : id < o.stageId! && o.stageId! < 7 ? 'Completed' : 'Not started'}</small></div></li>)}</ol> : <ol className="opp-progress">{stages.map((state, step) => ({ state, step })).reverse().map(({ state, step }) => <li key={state} className={step === index ? 'current' : index > step ? 'complete' : ''}><span>{index > step ? '✓' : step + 1}</span><div><strong>{STATE_LABELS[state]}</strong><small>{step === index ? 'Current stage' : index > step ? 'Completed' : 'Not started'}</small></div></li>)}</ol>}{closed && <p className="opp-notice">Closed with decision: {STATE_LABELS[o.state]}</p>}</Panel>;
}
function Overview({ opportunity: o, onSaved }: { opportunity: OpportunityDetail; onSaved: (value: OpportunityDetail) => void }) {
  const f = o.form, s = f.solicitation, d = f.dates;
  return <div className="opp-overview"><div className="space-y-3"><Panel title="Opportunity details" tone="violet"><Values values={[
    ['Opportunity name', f.title], ['Estimated value', money(o.estimatedValue, o.currencyCode, o.currencySymbol)], ['Estimated value (USD)', f.estimatedValueUsd ? money(f.estimatedValueUsd, 'USD') : ''], ['Currency', o.currencyName ? `${o.currencySymbol || o.currencyCode} (${o.currencyName})` : o.currencySymbol || o.currencyCode], ['Service line', f.serviceLine === 'Other' ? f.serviceLineOther : f.serviceLine], ['Lead source', LEAD_SOURCES.find(source => source.id === f.leadSource)?.label ?? f.leadSource], ['Owner', userLabel(o.owner)], ['Priority', f.priority], ['Description', f.description],
  ]} /></Panel><Panel title="Client & contacts" tone="teal">{o.client ? <><h3 className="mb-3 font-semibold">{o.client.name}</h3><ClientValues client={o.client} /></> : <p>Not provided</p>}</Panel></div><div className="space-y-3"><Panel title={`${f.rfp.type === 'GENERIC' ? 'Generic RFP' : f.rfp.type === 'QUESTIONNAIRE' ? 'Questionnaire' : 'RFP'} · solicitation`} tone="indigo"><Values values={[
    ['Solicitation / reference number', s.reference], ['Issuing agency / department', s.issuingAgency], ['Procurement contact', s.procurementContact], ['Submission method', s.submissionMethod], ...(f.rfp.type === 'QUESTIONNAIRE' ? [['Vendor demonstration required', s.vendorDemo]] as [string, string][] : []), ...(f.rfp.type === 'QUESTIONNAIRE' ? [['Contract term', s.contractTerm], ['Incumbent vendor', s.incumbentVendor], ['Pre-bid meeting', s.preBidMeeting]] as [string, string][] : []), ['Source document', f.rfp.source ? <DocumentDownload document={f.rfp.source} opportunityId={o.id} /> : undefined],
  ]} />
    <section className="mt-4"><h3 className="font-semibold">Important dates &amp; context</h3><Values values={[
      ['Questions due', d.questionsDue], ['Submission deadline', d.submissionDeadline],
    ]} /></section>{f.rfp.type === 'GENERIC' && <><Values values={[
    ['Submission format', f.rfp.submissionFormat === 'TECHNICAL_COST' ? 'Technical + Cost volumes' : 'Single combined proposal'], ['Evaluation basis', f.rfp.evaluation],
  ]} /><section className="mt-4"><h3 className="font-semibold">Required proposal sections</h3>{f.rfp.sections.length ? <ul className="mt-2 space-y-2 text-sm">{f.rfp.sections.map(section => <li key={section.key} className="flex items-start gap-2"><span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded border border-primary bg-primary text-primary-foreground"><Check className="size-3" aria-hidden="true" /><span className="sr-only">Selected:</span></span><span className="whitespace-pre-wrap break-words">{section.instructions || section.key}</span></li>)}</ul> : <p className="mt-2 text-sm text-muted-foreground">No proposal sections selected.</p>}</section></>}
    <section className="mt-4"><h3 className="font-semibold">Added questions</h3>{f.rfp.questions.length ? <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm">{f.rfp.questions.map(question => <li key={question.id} className="whitespace-pre-wrap break-words">{question.text}</li>)}</ol> : <p className="mt-2 text-sm text-muted-foreground">No questions added.</p>}</section></Panel>
    {o.visibleModules.includes('responses') && <Panel title="Responses & assigned work" tone="indigo"><p className="mb-3 text-sm">{o.responses?.length ?? 0} response items · {o.responses?.filter(r => r.state === 'APPROVED' && r.approvedRevision === r.revision).length ?? 0} current revisions approved</p>{o.responses?.map(response => <details key={response.id} className="opp-details mb-2"><summary>{response.title} · {RESPONSE_LABELS[response.state]}</summary><div className="p-3"><p className="text-xs text-muted-foreground">Owner: {userLabel(response.owner)} · Reviewer: {userLabel(response.reviewer)} · Due: {response.dueDate || 'Not provided'} · revision {response.revision}</p><p className="mt-3 whitespace-pre-wrap break-words text-sm">{response.answer || 'No response saved.'}</p></div></details>)}</Panel>}
    {o.visibleModules.includes('scope') && <Panel title="Saved scope summary" description={`Revision ${o.scope?.revision ?? 0}`} tone="violet"><Values values={Object.entries(SCOPE_FIELDS).map(([key, label]) => [label, o.scope?.[key as keyof typeof SCOPE_FIELDS]])} /></Panel>}
    {o.visibleModules.includes('estimation') && <Panel title="Saved estimation summary" description={`Revision ${o.estimation?.revision ?? 0}`} tone="indigo">{o.estimation ? <><strong className="text-2xl">{money(o.estimation.total, o.currencyCode)}</strong><p className="mt-2 text-sm text-muted-foreground">{o.estimation.rows.length} saved matrix rows</p><details className="opp-details mt-3"><summary>Matrix details & assumptions</summary><div className="space-y-2 p-3">{o.estimation.rows.map(row => <p key={row.id} className="text-sm">{row.workItem} · {row.hours} hours × {row.people} people × {money(row.hourlyRate, o.currencyCode)} / hour</p>)}<p className="whitespace-pre-wrap text-sm">{o.estimation.assumptions || 'Not provided'}</p></div></details></> : <p>Not provided</p>}</Panel>}
    {o.salesRecommendation && <Panel title="Sales Head recommendation" tone="teal"><Values values={[
      ['Reviewed by', userLabel(o.salesRecommendation.actor)], ['Package revision', o.salesRecommendation.packageRevision], ['Recommendation', o.salesRecommendation.note],
    ]} /></Panel>}
  </div><aside className="space-y-3" aria-label="Opportunity approval and progress"><ReviewActions opportunity={o} onSaved={onSaved} /><Progress opportunity={o} /></aside></div>;
}
const TABS: { key: Module; label: string }[] = [{ key: 'overview', label: 'Overview' }, { key: 'responses', label: 'Responses' }, { key: 'estimation', label: 'Estimation' }, { key: 'scope', label: 'Scope' }, { key: 'assignment', label: 'Assignment' }, { key: 'activity', label: 'Activity & Approvals' }];
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
  const tabs = TABS.filter(tab => o.visibleModules.includes(tab.key) && (approvalView || tab.key !== 'responses') && (!approvalView || tab.key !== 'assignment'));
  const requested = params.get('tab') ?? 'overview', active = tabs.find(tab => tab.key === requested)?.key ?? tabs[0]?.key;
  if (!active) return <Notice title="Access restricted" error="No workspace modules are visible to your user." />;
  return <div className="opp-page">
    <header className="opp-detail-heading">
      <div className="opp-detail-navigation">
        <Link to="/opportunity" className="opp-back">← Back to Pipeline</Link>
        <div className="opp-detail-reference"><span className="text-xs text-muted-foreground">{o.number}</span><Status state={o.state} opportunity={o} /></div>
      </div>
      <div className="opp-heading opp-detail-title">
        <div className="opp-detail-identity"><h2>{o.title}</h2><p className="text-muted-foreground">{o.clientName || 'Client not provided'} · {review ? `submitted package revision ${o.packageRevision ?? 'not submitted'}` : `saved revision ${o.revision}`}</p></div>
        {!review && access.edit && o.allowedActions.includes('EDIT') && <Button asChild variant="outline"><Link to={`/opportunity/${o.id}/edit`}>Edit Opportunity</Link></Button>}
      </div>
    </header>
    <div className="opp-workspace-strip"><div><small>Opportunity value</small><strong>{money(o.estimatedValue, o.currencyCode, o.currencySymbol)}</strong></div><div><small>Owner</small><strong>{userLabel(o.owner)}</strong></div><div><small>Submission deadline</small><div className="opp-deadline-value"><strong>{o.form.dates.submissionDeadline || 'Not provided'}</strong><small>{o.form.solicitation.submissionTimezone}</small></div></div><div><small>Current responsibility</small><strong>{o.approvalAssignees?.length ? o.approvalAssignees.map(userLabel).join(', ') : userLabel(o.responsible)}</strong></div></div>
    <Tabs value={active} onValueChange={async tab => { if (await confirm()) setParams(tab === 'overview' ? {} : { tab }); }}><TabsList className="opp-tabs">{tabs.map(tab => <TabsTrigger key={tab.key} value={tab.key}>{tab.label}</TabsTrigger>)}</TabsList>{tabs.map(tab => <TabsContent key={tab.key} value={tab.key} className="mt-3">{tab.key === 'overview' ? <Overview opportunity={o} onSaved={resource.setData} /> : tab.key === 'estimation' ? <EstimationModule opportunity={o} onSaved={resource.setData} readOnly={review} /> : tab.key === 'scope' ? <ScopeModule opportunity={o} onSaved={resource.setData} readOnly={review} /> : tab.key === 'assignment' ? <ResponseWorkspace opportunity={o} onSaved={resource.setData} /> : tab.key === 'responses' ? <Panel title="Saved response details" tone="indigo"><p className="mb-3 text-sm text-muted-foreground">Read-only reviewed package v{o.packageRevision}</p>{o.responses?.map(r => <article key={r.id} className="mb-3 rounded-lg border p-3"><h3 className="font-semibold">{r.title}</h3><p className="mt-1 text-xs text-muted-foreground">{RESPONSE_LABELS[r.state]} · revision {r.revision} · Owner {userLabel(r.owner)} · Reviewer {userLabel(r.reviewer)}</p><p className="mt-3 whitespace-pre-wrap break-words text-sm">{r.answer || 'No response saved.'}</p></article>)}</Panel> : <Activity opportunity={o} />}</TabsContent>)}</Tabs>
  </div>;
}
