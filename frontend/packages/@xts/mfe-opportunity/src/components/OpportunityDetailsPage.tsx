import { QuestionViewer } from './QuestionViewer';
import { CalendarClock, Check, ClipboardList, FileText, HelpCircle, LayoutGrid, Lock, Pencil, Trash2, Upload } from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Badge, type BadgeProps, Button, Tabs, TabsContent, TabsList, TabsTrigger, useSetPageTitle } from '@xts/design-system';
import type { Estimation, EstimationVersion, OpportunityDetail, OpportunityState, SourceDocument } from '@xts/api-contracts';
import { useOpportunityService } from '../services/OpportunityService';
import { useResource } from '../hooks/useResource';
import { useUnsaved } from '../hooks/useUnsaved';
import { useOpportunityAccess } from '../hooks/useOpportunityAccess';
import { CONTEXT_FIELDS, money, STATE_LABELS, userLabel } from '../lib/workflow';
import { LEAD_SOURCES } from '../lib/opportunityOptions';
import { opportunityStatus } from '../lib/opportunityStatus';
import { DetailDrawer, formatLocalDate, initials, Loading, Notice, OpportunityNumber, Panel, Values } from './ui';
import { ClientValues } from './ClientPicker';
import { EstimationModule, ScopeModule, ScopeReadOnly } from './PreparationModules';
import { ResponseWorkspace } from './ResponseWorkspace';
import { ReviewActions } from './ReviewActions';
import { DocumentDownload } from './DocumentDownload';
import { OpportunityProgress } from './OpportunityProgress';
import { SavedEstimationBreakdown } from './SavedEstimationBreakdown';

const STATUS_BADGE_VARIANT: Record<OpportunityState, BadgeProps['variant']> = {
  PREPARATION_PENDING: 'muted', IN_PROGRESS: 'info', SALES_REVIEW: 'warning', GATE1_PENDING: 'warning', GATE1_GO: 'success', SALES_REJECTED: 'critical', GATE1_NO_GO: 'critical',
};
function Documents({ opportunity: o }: { opportunity: OpportunityDetail }) {
  const service = useOpportunityService();
  const [documents, setDocuments] = useState<SourceDocument[]>([]);
  const [loading, setLoading] = useState(true), [uploading, setUploading] = useState(false), [deleting, setDeleting] = useState<string | null>(null), [error, setError] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null), [documentTitle, setDocumentTitle] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<SourceDocument | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const refresh = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const saved = await service.listDocuments(o.id);
      setDocuments(saved.filter(document => !o.form.rfp.source?.storagePath || document.storagePath !== o.form.rfp.source.storagePath));
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to load documents.'); }
    finally { setLoading(false); }
  }, [o.id, o.form.rfp.source, service]);
  useEffect(() => { void refresh(); }, [refresh]);
  async function upload(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedFile || !documentTitle.trim()) { setError('Enter a document name and choose a file.'); return; }
    setUploading(true); setError('');
    try {
      await service.uploadAttachment(o.id, selectedFile, documentTitle.trim());
      setSelectedFile(null); setDocumentTitle('');
      if (input.current) input.current.value = '';
      await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to upload the document.'); }
    finally { setUploading(false); }
  }
  async function remove(document: SourceDocument) {
    if (!document.canDelete) return;
    setDeleting(document.id); setError('');
    try { await service.deleteDocument(o.id, document); setConfirmDelete(null); await refresh(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to delete the document.'); }
    finally { setDeleting(null); }
  }
  const activeDocuments = documents.filter(document => document.isActive !== false);
  const deletedDocuments = documents.filter(document => document.isActive === false);
  const displayDocumentName = (document: SourceDocument) => {
    return document.title || document.name.replace(/\.[^.]+$/, '');
  };
  const fileSize = (size?: number | string | null) => { const bytes = Number(size); return !Number.isFinite(bytes) || bytes < 0 ? '—' : bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`; };
  const date = (value?: string | null) => value ? new Date(value).toLocaleString('en-GB', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }) : '—';
  const documentRows = (rows: SourceDocument[], deleted = false) => <div className="overflow-x-auto"><table className="w-full min-w-[760px] table-fixed text-left text-sm"><colgroup><col className="w-[30%]" /><col className="w-[8%]" /><col className="w-[8%]" /><col className="w-[8%]" /><col className="w-[18%]" /><col className="w-[17%]" /><col className="w-[11%]" /></colgroup><thead className="sticky top-0 z-10 border-b bg-muted/60 text-xs text-foreground"><tr><th className="px-2 py-2.5 font-bold">Document</th><th className="px-2 py-2.5 font-bold">Download</th><th className="px-2 py-2.5 font-bold">Type</th><th className="px-2 py-2.5 font-bold">Size</th><th className="px-2 py-2.5 font-bold">Uploaded by</th><th className="px-2 py-2.5 font-bold">Uploaded at</th>{deleted ? <th className="px-2 py-2.5 font-bold">Deleted</th> : <th className="px-2 py-2.5 text-right font-bold">Actions</th>}</tr></thead><tbody className="divide-y">{rows.map(document => <tr key={document.id} className={deleted ? 'bg-muted/25 text-muted-foreground' : 'transition-colors hover:bg-primary/[0.03]'}><td className="max-w-[280px] px-2 py-3"><p className="truncate font-semibold" title={displayDocumentName(document)}>{displayDocumentName(document)}</p></td><td className="px-2 py-3"><DocumentDownload document={document} opportunityId={o.id} iconOnly /></td><td className="px-2 py-3"><span className={`rounded-md px-2 py-1 text-[11px] font-semibold uppercase ${deleted ? 'bg-slate-200/70 text-slate-600' : 'bg-primary/10 text-primary'}`}>{document.type || document.name.split('.').pop() || '—'}</span></td><td className="whitespace-nowrap px-2 py-3 text-xs">{fileSize(document.size)}</td><td className="truncate px-2 py-3 text-xs" title={document.uploadedByName}>{document.uploadedByName || '—'}</td><td className="whitespace-nowrap px-2 py-3 text-xs">{date(document.uploadedAt)}</td>{deleted ? <td className="px-2 py-3 text-xs"><p className="truncate font-medium">{document.deletedByName || 'Unknown user'}</p><p>{date(document.deletedAt)}</p></td> : <td className="px-2 py-3"><div className="flex justify-end">{document.canDelete && <Button type="button" variant="outline" size="icon" className="h-8 w-8 border-destructive/30 text-destructive hover:border-destructive hover:bg-destructive/5" title={`Delete ${document.name}`} aria-label={`Delete ${document.name}`} disabled={deleting === document.id} onClick={() => setConfirmDelete(document)}><Trash2 className="size-3.5" aria-hidden="true" /></Button>}</div></td>}</tr>)}</tbody></table></div>;
  return <Panel title="Documents" description="Upload and download files attached to this opportunity" tone="neutral">
    <form onSubmit={event => void upload(event)} className="rounded-lg border bg-card p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3"><h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Upload document</h3><span className="text-xs text-muted-foreground">Max 25 MB per file</span></div>
      <div className="grid items-end gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
        <label className="block text-xs font-medium">File <span className="text-destructive">*</span><span className="mt-1.5 flex h-10 items-center gap-3 rounded-md border bg-background px-2"><input ref={input} type="file" accept=".pdf,.doc,.docx,.txt,.xls,.xlsx" className="min-w-0 flex-1 text-xs file:mr-3 file:cursor-pointer file:rounded file:border-0 file:bg-primary file:px-3 file:py-2 file:font-medium file:text-primary-foreground" onChange={event => { const file = event.target.files?.[0] ?? null; setSelectedFile(file); setDocumentTitle(file ? file.name.replace(/\.[^.]+$/, '') : ''); }} required /></span></label>
        <label className="block text-xs font-medium">Document name <span className="text-destructive">*</span><input value={documentTitle} onChange={event => setDocumentTitle(event.target.value)} maxLength={100} placeholder="e.g. Bibliocommons RFP" className="mt-1.5 h-10 w-full rounded-md border bg-background px-3 text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-primary" required /></label>
        <div className="sm:pb-0"><Button type="submit" size="sm" className="h-10 gap-2 whitespace-nowrap" disabled={uploading || !selectedFile || !documentTitle.trim()}><Upload className="size-4" aria-hidden="true" />{uploading ? 'Saving...' : 'Save document'}</Button></div>
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
    </form>
    <section className="mt-4 rounded-xl border bg-card p-3 shadow-sm sm:p-4"><div className="mb-3 flex items-center justify-between"><h3 className="text-xs font-bold uppercase tracking-wide text-foreground">Saved documents</h3><span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">{activeDocuments.length} document{activeDocuments.length === 1 ? '' : 's'}</span></div><div className="max-h-[480px] overflow-auto overscroll-contain rounded-md border">
      {loading ? <p role="status" className="p-4 text-sm text-muted-foreground">Loading documents...</p> : activeDocuments.length ? documentRows(activeDocuments) : <p className="border-t py-5 text-center text-sm text-muted-foreground">No documents attached yet.</p>}
      {!!deletedDocuments.length && <div className="mt-4 border-t border-dashed px-2 pb-2 pt-4"><div className="mb-3 flex items-center justify-between"><h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Deleted documents</h4><span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">{deletedDocuments.length} document{deletedDocuments.length === 1 ? '' : 's'}</span></div>{documentRows(deletedDocuments, true)}</div>}</div>
    </section>
    {confirmDelete && <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onMouseDown={event => { if (event.target === event.currentTarget && !deleting) setConfirmDelete(null); }}><section role="alertdialog" aria-modal="true" aria-labelledby="delete-document-title" aria-describedby="delete-document-description" className="w-full max-w-md rounded-lg border bg-background p-5 shadow-xl"><h2 id="delete-document-title" className="text-base font-semibold">Delete document?</h2><p id="delete-document-description" className="mt-2 break-words text-sm text-muted-foreground">&ldquo;{confirmDelete.name}&rdquo; will be removed from this opportunity. You can delete only documents you uploaded.</p>{error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}<div className="mt-5 flex justify-end gap-2"><Button type="button" variant="outline" size="sm" disabled={!!deleting} onClick={() => { setConfirmDelete(null); setError(''); }}>Cancel</Button><Button type="button" variant="destructive" size="sm" disabled={!!deleting} onClick={() => void remove(confirmDelete)}>{deleting === confirmDelete.id ? 'Deleting...' : 'Delete document'}</Button></div></section></div>}
  </Panel>;
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
/** Compact scope card; full summary text plus the styled Alignment/Risks lists (same look as the Scope tab) live in the drawer. */
function ScopeSummaryPanel({ o }: { o: OpportunityDetail }) {
  const scope = o.scope;
  return <Panel title="Saved scope summary" tone="rose" accentIcon headerRight={<div className="flex shrink-0 items-center gap-2">
    {scope && <DetailDrawer title="Scope & assessment" description="Full scope summary, alignment and risk items as saved.">
      <Panel title="Scope" tone="violet" icon={ClipboardList} accentIcon><p className="whitespace-pre-wrap break-words text-sm">{scope.summary || 'Not provided'}</p></Panel><div className="mt-4"><ScopeReadOnly scope={scope} /></div>
    </DetailDrawer>}
  </div>}>{scope ? <><Values values={[['Scope', scope.summary || 'Not provided']]} /><Values values={[['Alignment', `${scope.alignment.length} item${scope.alignment.length === 1 ? '' : 's'}`], ['Risks', `${scope.risks.length} item${scope.risks.length === 1 ? '' : 's'} · ${scope.risks.filter(item => item.severity === 'HIGH').length} high`]]} /></> : <p className="text-sm">Not provided</p>}</Panel>;
}
/** Splits a formatted money string ("₹5,81,564.10") at its last decimal point so the cents can
 * render smaller than the whole-number part — purely a display split of the same formatted value. */
function splitMoney(formatted: string): [string, string] {
  const i = formatted.lastIndexOf('.');
  return i === -1 ? [formatted, ''] : [formatted.slice(0, i), formatted.slice(i)];
}
/** Compact estimation card; the phase allocation, person-weeks and USD costs live in the drawer. */
function EstimationSummaryPanel({ o }: { o: OpportunityDetail }) {
  const estimation = o.estimation;
  const [whole, cents] = estimation ? splitMoney(money(estimation.total, 'USD')) : ['', ''];
  return <Panel title="Saved estimation summary" tone="amber" accentIcon>
    {estimation ? <>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">Estimate total<Badge variant="warning" size="sm">USD</Badge></div>
      <p className="mb-4 mt-1 text-lg font-semibold tabular-nums">{whole}{cents}</p>
      <div className="flex items-center justify-between gap-3 border-t pt-3 text-sm">
        {/* <span><strong className="text-base">{estimation.rows.length}</strong> <span className="text-muted-foreground">work items</span></span> */}
        <DetailDrawer title="Estimation matrix" description="Saved resource allocation, person-weeks and USD costs." trigger={<button type="button" className="text-sm font-semibold text-amber-700 hover:underline dark:text-amber-400">View estimate →</button>}>
          <SavedEstimationBreakdown estimation={estimation} />
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
  const statusLabel = opportunityStatus(o).substage ?? opportunityStatus(o).stage ?? STATE_LABELS[o.state];

  return (
    <div className="opp-overview">
      <div className="space-y-3">
        <Panel title="Opportunity details" tone="violet" accentIcon className="opp-record-panel">
          <dl className="opp-record-details">
            <div><dt>Opportunity</dt><dd className="opp-record-title">{o.title}</dd><dd className="opp-record-reference">{o.number}</dd></div>
            <div className="opp-record-status"><dt>Status</dt><dd className="opp-record-badges"><Badge variant={STATUS_BADGE_VARIANT[o.state] ?? 'outline'} size="sm">{statusLabel}</Badge></dd></div>
            <div className="opp-record-wide opp-record-budget">
              <dt className="text-xs text-muted-foreground">Client budget</dt>
              <dd className="mt-0.5 flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                <strong className="text-base font-semibold">{money(o.estimatedValue, o.currencyCode)}</strong>
                {f.estimatedValueUsd ? <span className="text-xs text-muted-foreground">USD equivalent · {money(f.estimatedValueUsd, 'USD')}</span> : null}
                <span className="text-xs text-muted-foreground">Currency: {o.currencyCode || 'Not provided'}</span>
              </dd>
            </div>
            <div><dt className="text-xs text-muted-foreground">Service line</dt><dd className="mt-0.5">{f.serviceLine === 'Other' ? f.serviceLineOther : f.serviceLine}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Lead source</dt><dd className="mt-0.5">{LEAD_SOURCES.find(source => source.id === f.leadSource)?.label ?? f.leadSource}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Owner</dt><dd className="mt-0.5">{userLabel(o.owner)}</dd></div>
            <div><dt>Priority</dt><dd>{f.priority || 'Not provided'}</dd></div>
            <div className="opp-record-wide"><dt>Description</dt><dd className="whitespace-pre-wrap">{f.description || 'Not provided'}</dd></div>
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
                ['Recommendation', o.salesRecommendation.note],
              ]}
            />
          </Panel>
        )}
      </div>
    </div>
  );
}
type TabKey = 'overview' | 'qa' | 'scope' | 'estimation' | 'documents';
export function OpportunityDetailsPage({ review = false }: { review?: boolean }) {
  const [selectedVersion, setSelectedVersion] = useState<EstimationVersion | null>(null);
  const [estimationSidebar, setEstimationSidebar] = useState<HTMLDivElement | null>(null);
  const [estimationLayout, setEstimationLayout] = useState<HTMLDivElement | null>(null);
  useLayoutEffect(() => {
    if (!estimationLayout) return;
    let frame = 0;
    const measure = () => {
      const height = Math.max(280, Math.floor(window.innerHeight - Math.max(12, estimationLayout.getBoundingClientRect().top) - 16));
      const nextHeight = `${height}px`;
      if (estimationLayout.style.getPropertyValue('--opp-estimation-height') !== nextHeight) {
        estimationLayout.style.setProperty('--opp-estimation-height', nextHeight);
      }
    };
    const resize = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        frame = 0;
        measure();
      });
    };
    resize();
    window.addEventListener('resize', resize);
    return () => {
      window.removeEventListener('resize', resize);
      if (frame) cancelAnimationFrame(frame);
      estimationLayout.style.removeProperty('--opp-estimation-height');
    };
  }, [estimationLayout]);
  const estimationDraft = useRef<(() => Estimation) | null>(null);
  const registerDraft = useCallback((reader: (() => Estimation) | null) => { estimationDraft.current = reader; }, []);
  const { id } = useParams(), service = useOpportunityService(), access = useOpportunityAccess(), [params, setParams] = useSearchParams();
  useEffect(() => { setSelectedVersion(null); }, [id]);
  const approvalView = review || access.approvals;
  const load = useCallback((signal: AbortSignal) => service.detail(id!, signal, approvalView ? 'REVIEW' : 'DETAILS'), [service, id, approvalView]);
  const resource = useResource(load, Boolean(id && access.view)), confirm = useUnsaved(false);
  const o = resource.data;
  useSetPageTitle(review ? 'Opportunity review' : 'Opportunity details');
  if (resource.loading) return <Loading />;
  if (resource.error) return <Notice error={resource.error} retry={resource.reload} />;
  if (!o) return <Notice error="This opportunity was not returned. It may have been removed or be outside your permitted scope." />;
  // While Identified or Qualifying (Go/No-Go), only Overview is open; every other
  // workspace tab opens once CEO approval moves it into Solution/Scoping Estimation.
  const awaitingEstimation = o.stageId === 1 || o.stageId === 2;
  const tabs: { key: TabKey; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'qa', label: 'RFP Q&A' },
    { key: 'scope', label: 'Scope & Assessment' },
    { key: 'estimation', label: 'Estimate' },
    { key: 'documents', label: 'Documents' },
  ];
  const requested = params.get('tab') ?? 'overview', active = tabs.find(tab => tab.key === requested)?.key ?? tabs[0]?.key;
  if (!active) return <Notice title="Access restricted" error="No workspace modules are visible to your user." />;
  const responseCount = o.responses?.length ?? 0;
  return <div className="opp-page">
    <header className="opp-detail-heading">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-2">
          <Link to="/opportunity" className="opp-back shrink-0">← Back to Pipeline</Link>
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-primary/5 px-3 py-2" aria-label="Current opportunity">
            <Badge variant="muted" className="shrink-0 border-primary/20 bg-primary/10 font-semibold text-primary">{o.number || o.id}</Badge>
            <h1 className="min-w-0 break-words text-base font-semibold text-foreground">{o.title}</h1>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          {access.edit && o.allowedActions.includes('EDIT') && <Button variant="outline" asChild><Link to={`/opportunity/${o.id}/edit`}><Pencil className="size-3.5" aria-hidden="true" />Edit opportunity</Link></Button>}
        </div>
      </div>
    </header>
    <Tabs value={active} onValueChange={async tab => { if (await confirm()) { if (tab !== active) setSelectedVersion(null); setParams(tab === 'overview' ? {} : { tab }); } }}>
      <div className="opp-detail-toolbar">
        <TabsList className="opp-tabs">{tabs.map(tab => <TabsTrigger key={tab.key} value={tab.key}>{tab.label}</TabsTrigger>)}</TabsList>
        <ReviewActions opportunity={active === 'estimation' ? { ...o, allowedActions: o.allowedActions.filter(action => action !== 'SUBMIT_ESTIMATE') } : o} onSaved={resource.setData} variant="toolbar" selectedVersion={selectedVersion} getEstimation={() => estimationDraft.current?.()} />
      </div>
      <div ref={active === 'estimation' && !awaitingEstimation ? setEstimationLayout : undefined} className={`opp-detail-layout mt-3${active === 'estimation' && !awaitingEstimation ? ' opp-estimation-fit' : ''}`}>
        <div className="opp-detail-workspace">
          {tabs.map(tab => <TabsContent key={tab.key} value={tab.key} className="mt-0">
            {tab.key !== 'overview' && tab.key !== 'documents' && awaitingEstimation ? <div role="status" className="flex flex-col items-center rounded-lg border border-dashed bg-background px-6 py-10 text-center">
              <span className="flex size-10 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300"><Lock className="size-5" aria-hidden="true" /></span>
              <h3 className="mt-3 text-sm font-semibold">Available after CEO approval</h3>
              <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">This opportunity is currently in {o.stageId === 1 ? 'Identified' : 'Qualifying (Go/No-Go)'}. {tab.label} will be available once the CEO approves this opportunity and it moves to the Solution/Scoping Estimation (Engineering) stage.</p>
            </div> : tab.key === 'overview' ? <Overview opportunity={o} />
              : tab.key === 'estimation' ? <EstimationModule key={o.id} opportunity={o} onSaved={resource.setData} readOnly={false} registerDraft={registerDraft} sidebarTarget={estimationSidebar} selectedVersion={selectedVersion} onSelectVersion={setSelectedVersion} />
                : tab.key === 'scope' ? <ScopeModule key={o.id} opportunity={o} onSaved={resource.setData} readOnly={false} />
                  : tab.key === 'documents' ? <Documents opportunity={o} />
                    : <ResponseWorkspace opportunity={o} onSaved={resource.setData} />}
          </TabsContent>)}
        </div>
        <aside className="opp-detail-sidebar" aria-label="Opportunity progress">
          <OpportunityProgress opportunity={o} />
          {active === 'estimation' && !awaitingEstimation && <div ref={setEstimationSidebar} className="min-w-0" />}
        </aside>
      </div>
    </Tabs>
  </div>;
}
