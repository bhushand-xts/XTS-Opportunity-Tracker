import { gql, useQuery } from '@apollo/client';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { CalendarDays, Download, Eye, FileText, Search } from 'lucide-react';
import { Badge, Button, Input, Label, Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tabs, TabsContent, TabsList, TabsTrigger, useSetPageTitle } from '@xts/design-system';
import type { OpportunityDetail, SourceDocument } from '@xts/api-contracts';
import { useOpportunityService } from '../services/OpportunityService';
import { useOpportunityAccess } from '../hooks/useOpportunityAccess';
import { useResource } from '../hooks/useResource';
import { GET_OPPORTUNITY_OWNER_DIRECTORY, type OwnerDirectoryData } from '../services/userDirectory.queries';
import { mapOwnerDirectory } from '../services/useOwnerDirectory';
import { SavedEstimationBreakdown } from './SavedEstimationBreakdown';
import { DocumentDownload } from './DocumentDownload';
import { Loading, Notice } from './ui';

const OPPORTUNITY_SUMMARY_QUERY = gql`
  query OpportunitySummaryReport {
    opportunities(queue: "PIPELINE") {
      opportunityId opportunityNumber opportunityName clientName ownerId
      stageId stageName subStageId subStageName estimatedValueUsd submittedEstimateUsd createdDt
    }
  }
`;

interface ReportOpportunity {
  opportunityId: number;
  opportunityNumber: string | null;
  opportunityName: string | null;
  clientName: string | null;
  ownerId: number | null;
  stageId: number | null;
  stageName: string | null;
  subStageId: number | null;
  subStageName: string | null;
  estimatedValueUsd: number | null;
  submittedEstimateUsd: number | null;
  createdDt: string | null;
}

const today = () => {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};
function quarterStart(date: Date) { return new Date(date.getFullYear(), Math.floor(date.getMonth() / 3) * 3, 1); }
function dateString(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
function periodRange(period: string) {
  const now = today();
  if (period === 'LAST_QUARTER') {
    const end = quarterStart(now);
    const start = new Date(end.getFullYear(), end.getMonth() - 3, 1);
    return { from: dateString(start), to: dateString(new Date(end.getFullYear(), end.getMonth(), 0)) };
  }
  const start = quarterStart(now);
  return { from: dateString(start), to: dateString(now) };
}
function reportStatus(stageId: number | null | undefined) {
  if (stageId === 7) return 'Won';
  if (stageId === 8) return 'Lost';
  if (stageId === 9) return 'No-Bid / Declined';
  return 'Open';
}
function money(value: number | null | undefined) {
  return value == null || !Number.isFinite(value) ? '—' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value);
}
function csvCell(value: string) { return `"${value.replace(/"/g, '""')}"`; }

function Field({ label, children }: { label: string; children?: ReactNode }) {
  return <div className="min-w-0 rounded-md border bg-card px-3 py-2"><p className="text-[11px] font-medium text-muted-foreground">{label}</p><div className="mt-1 break-words text-sm font-medium">{children ?? 'Not provided'}</div></div>;
}

function OpportunityReportDrawer({ opportunity, onClose }: { opportunity: ReportOpportunity | null; onClose: () => void }) {
  const service = useOpportunityService();
  const load = useCallback((signal: AbortSignal) => service.detail(String(opportunity!.opportunityId), signal, 'DETAILS'), [opportunity?.opportunityId, service]);
  const detailResource = useResource(load, Boolean(opportunity), 0, opportunity ? String(opportunity.opportunityId) : undefined);
  const detail = detailResource.data;
  const [documents, setDocuments] = useState<SourceDocument[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [documentsError, setDocumentsError] = useState('');
  // Load attachment metadata only while the report drawer is open.
  useEffect(() => {
    if (!opportunity) return;
    let active = true;
    setDocumentsLoading(true); setDocumentsError('');
    service.listDocuments(String(opportunity.opportunityId)).then(result => { if (active) setDocuments(result); })
      .catch(error => { if (active) setDocumentsError(error instanceof Error ? error.message : 'Unable to load documents.'); })
      .finally(() => { if (active) setDocumentsLoading(false); });
    return () => { active = false; };
  }, [opportunity?.opportunityId, service]);

  return <Sheet open={Boolean(opportunity)} onOpenChange={open => { if (!open) onClose(); }}>
    <SheetContent className="flex w-full flex-col p-0 sm:max-w-4xl">
      <SheetHeader className="border-b px-5 py-4 pr-12">
        <SheetTitle>{opportunity?.opportunityName || 'Opportunity details'}</SheetTitle>
        <SheetDescription>{opportunity?.opportunityNumber || 'Opportunity'} · Read-only report view</SheetDescription>
      </SheetHeader>
      {!opportunity ? null : detailResource.loading ? <div className="p-6"><Loading /></div>
        : detailResource.error ? <div className="p-5"><Notice error={detailResource.error} retry={detailResource.reload} /></div>
          : detail ? <ReportDetailTabs key={opportunity.opportunityId} detail={detail} documents={documents} documentsLoading={documentsLoading} documentsError={documentsError} />
            : <div className="p-5 text-sm text-muted-foreground">Opportunity details are unavailable.</div>}
    </SheetContent>
  </Sheet>;
}

function ReportDetailTabs({ detail, documents, documentsLoading, documentsError }: { detail: OpportunityDetail; documents: SourceDocument[]; documentsLoading: boolean; documentsError: string }) {
  const selectedEstimation = detail.estimation;
  const responses = detail.responses ?? [];
  const questionnaire = detail.form.rfp.type === 'QUESTIONNAIRE';
  const responseGroups = questionnaire
    ? responses.reduce<{ category: string; items: typeof responses }[]>((groups, response) => {
        const category = response.category?.trim() || 'Other questions';
        const existing = groups.find(group => group.category === category);
        if (existing) existing.items.push(response);
        else groups.push({ category, items: [response] });
        return groups;
      }, [])
    : [{ category: '', items: responses }];
  let questionNumber = 0;
  return <Tabs defaultValue="details" className="flex min-h-0 flex-1 flex-col">
    <div className="border-b px-4 pt-3"><TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto bg-transparent p-0">
      {[['details', 'Opportunity details'], ['qa', 'RFP Q&A'], ['scope', 'Scope & assessment'], ['estimate', 'Estimate'], ['documents', 'Documents']].map(([value, label]) => <TabsTrigger key={value} value={value} className="shrink-0">{label}</TabsTrigger>)}
    </TabsList></div>
    <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
      <TabsContent value="details" className="mt-0 space-y-2.5">
        <section className="rounded-lg border border-indigo-200 bg-card p-3"><h3 className="mb-2 text-sm font-semibold">Opportunity details</h3><div className="grid gap-x-4 gap-y-1.5 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Opportunity name">{detail.title}</Field><Field label="Reference">{detail.number}</Field><Field label="Stage">{detail.stageName || detail.stageId && `Stage ${detail.stageId}`}</Field><Field label="Substage">{detail.subStageName}</Field><Field label="Status">{reportStatus(detail.stageId)}</Field><Field label="Owner">{detail.owner?.name}</Field><Field label="Client budget (USD)">{money(detail.estimatedValueUsd ? Number(detail.estimatedValueUsd) : null)}</Field><Field label="Priority">{detail.priority}</Field><Field label="Submission deadline">{detail.submissionDeadline}</Field><Field label="Description">{detail.form.description}</Field>
        </div></section>
        <section className="rounded-lg border border-emerald-200 bg-card p-3"><h3 className="mb-2 text-sm font-semibold">Client & contacts</h3>{detail.client ? <div className="grid gap-x-4 gap-y-1.5 sm:grid-cols-2">
          <Field label="Client">{detail.client.name}</Field><Field label="Account type">{detail.client.accountTypeName}</Field><Field label="Sector / industry">{detail.client.industryName}</Field><Field label="Website">{detail.client.website}</Field><Field label="Address">{[detail.client.streetAddress, detail.client.city, detail.client.stateProvince, detail.client.country].filter(Boolean).join(', ')}</Field>
          {[detail.client.primaryContact, ...detail.client.additionalContacts].map((contact, index) => <Field key={`${contact.email}-${index}`} label={index === 0 ? 'Primary contact' : `Additional contact ${index}`}>
            {[contact.name, contact.title, contact.email, contact.phone].filter(Boolean).join(' · ')}
          </Field>)}
        </div> : <p className="text-sm text-muted-foreground">No client linked.</p>}</section>
        <section className="rounded-lg border border-sky-200 bg-card p-3"><h3 className="mb-2 text-sm font-semibold">Solicitation details</h3><div className="grid gap-x-4 gap-y-1.5 sm:grid-cols-2">
          <Field label="Solicitation / reference number">{detail.form.solicitation.reference}</Field><Field label="Issuing agency / department">{detail.form.solicitation.issuingAgency}</Field><Field label="Procurement contact">{detail.form.solicitation.procurementContact}</Field><Field label="Submission method">{detail.form.solicitation.submissionMethod}</Field><Field label="Questions due">{detail.form.dates.questionsDue}</Field><Field label="Submission deadline">{detail.form.dates.submissionDeadline}</Field><Field label="Contract term">{detail.form.solicitation.contractTerm}</Field><Field label="Incumbent vendor">{detail.form.solicitation.incumbentVendor}</Field>
        </div></section>
      </TabsContent>
      <TabsContent value="qa" className="mt-0 space-y-4">{responses.length ? responseGroups.map(group => <section key={group.category || 'all-questions'} className="space-y-2">{questionnaire && <h3 className="border-b pb-1.5 text-sm font-semibold text-foreground">{group.category}</h3>}{group.items.map(response => { questionNumber += 1; return <div key={response.id} className="rounded-md border px-3 py-2.5"><p className="text-xs font-semibold text-muted-foreground">Question {questionNumber}</p><h4 className="mt-0.5 font-medium">{response.title}</h4><p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{response.answer || 'No answer provided.'}</p></div>; })}</section>) : <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No RFP questions or answers are available.</p>}</TabsContent>
      <TabsContent value="scope" className="mt-0">{detail.scope ? <div className="space-y-4 text-sm"><section><h3 className="mb-1 font-semibold">Scope</h3><p className="whitespace-pre-wrap text-muted-foreground">{detail.scope.summary || 'No scope summary provided.'}</p></section><section><h3 className="mb-1 font-semibold">Alignment</h3>{detail.scope.alignment.length ? <ul className="list-inside list-disc space-y-1 text-muted-foreground">{detail.scope.alignment.map(item => <li key={item.id}>{item.text}</li>)}</ul> : <p className="text-muted-foreground">No alignment details provided.</p>}</section><section><h3 className="mb-1 font-semibold">Risks</h3>{detail.scope.risks.length ? <ul className="list-inside list-disc space-y-1 text-muted-foreground">{detail.scope.risks.map(item => <li key={item.id}>{item.description} <span className="text-xs">({item.severity})</span></li>)}</ul> : <p className="text-muted-foreground">No risks recorded.</p>}</section></div> : <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No saved scope and assessment.</p>}</TabsContent>
      <TabsContent value="estimate" className="mt-0 space-y-3">{selectedEstimation ? <><div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3"><p className="text-xs text-muted-foreground">Estimate value</p><p className="text-xl font-semibold">{money(Number(selectedEstimation.total))}</p></div><SavedEstimationBreakdown estimation={selectedEstimation} /></> : <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No saved estimate is available.</p>}</TabsContent>
      <TabsContent value="documents" className="mt-0 space-y-2">{documentsLoading ? <p className="text-sm text-muted-foreground">Loading documents…</p> : documentsError ? <p role="alert" className="text-sm text-destructive">{documentsError}</p> : documents.length ? documents.map(document => <div key={document.id} className="flex items-center justify-between gap-3 rounded-lg border bg-card p-3"><div className="flex min-w-0 items-center gap-2"><FileText className="size-4 shrink-0 text-primary" /><span className="truncate text-sm font-medium">{document.title || document.name}</span></div><DocumentDownload document={document} opportunityId={detail.id} iconOnly /></div>) : <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No documents attached.</p>}</TabsContent>
    </div>
  </Tabs>;
}

export function OpportunitySummaryReport() {
  useSetPageTitle('Opportunity Summary Report');
  const access = useOpportunityAccess();
  const report = useQuery<{ opportunities: ReportOpportunity[] }>(OPPORTUNITY_SUMMARY_QUERY, { fetchPolicy: 'cache-and-network' });
  const directory = useQuery<OwnerDirectoryData>(GET_OPPORTUNITY_OWNER_DIRECTORY, { fetchPolicy: 'cache-and-network' });
  const owners = useMemo(() => mapOwnerDirectory(directory.data), [directory.data]);
  const initialRange = periodRange('THIS_QUARTER');
  const [period, setPeriod] = useState('THIS_QUARTER');
  const [from, setFrom] = useState(initialRange.from), [to, setTo] = useState(initialRange.to);
  const [ownerId, setOwnerId] = useState('ALL'), [search, setSearch] = useState('');
  const [applied, setApplied] = useState({ from: initialRange.from, to: initialRange.to, ownerId: 'ALL' });
  const [selected, setSelected] = useState<ReportOpportunity | null>(null);
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (report.data?.opportunities ?? []).filter(item => {
      const created = item.createdDt?.slice(0, 10) ?? '';
      const ownerMatch = applied.ownerId === 'ALL' || String(item.ownerId ?? '') === applied.ownerId;
      const dateMatch = (!applied.from || created >= applied.from) && (!applied.to || created <= applied.to);
      const textMatch = !query || `${item.opportunityName ?? ''} ${item.opportunityNumber ?? ''} ${item.clientName ?? ''}`.toLowerCase().includes(query);
      return ownerMatch && dateMatch && textMatch;
    });
  }, [report.data, applied, search]);

  function changePeriod(value: string) {
    setPeriod(value);
    if (value === 'CUSTOM') {
      setFrom('');
      setTo('');
    } else {
      const range = periodRange(value);
      setFrom(range.from);
      setTo(range.to);
    }
  }
  function applyFilters() { setApplied({ from, to, ownerId }); }
  function downloadReport() {
    const headings = ['Opportunity Name', 'Client', 'Owner', 'Stage', 'Client Budget (USD)', 'Estimate Value (USD)', 'Status'];
    const rows = filtered.map(item => {
      const owner = owners.find(person => person.id === String(item.ownerId))?.name ?? 'Unassigned';
      const stage = item.stageName || (item.stageId == null ? 'Stage unavailable' : `Stage ${item.stageId}`);
      return [item.opportunityName ?? '', item.clientName ?? '', owner, stage, item.estimatedValueUsd == null ? '' : String(item.estimatedValueUsd), item.stageId != null && item.stageId >= 5 && item.submittedEstimateUsd != null ? String(item.submittedEstimateUsd) : '', reportStatus(item.stageId)];
    });
    const csv = [headings, ...rows].map(row => row.map(value => csvCell(value)).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'opportunity-summary-report.csv'; anchor.click(); window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  if (!access.view) return <div className="p-6"><Notice error="You do not have permission to view opportunity reports." /></div>;
  if (report.loading && !report.data) return <div className="p-6"><Loading /></div>;
  if (report.error) return <div className="p-6"><Notice error={report.error} retry={() => void report.refetch()} /></div>;
  return <div className="space-y-5 p-4 sm:p-6 lg:p-8">
    <header><h1 className="text-2xl font-bold tracking-tight">Opportunity Summary Report</h1></header>
    <section className="flex flex-wrap items-end gap-3">
      <div className="w-full space-y-1 sm:w-44"><Label htmlFor="summary-period">Time period</Label><select id="summary-period" value={period} onChange={event => changePeriod(event.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="THIS_QUARTER">This quarter</option><option value="LAST_QUARTER">Last quarter</option><option value="CUSTOM">Custom range</option></select></div>
      {period === 'CUSTOM' && <><div className="w-full space-y-1 sm:w-36"><Label htmlFor="summary-from">From</Label><Input id="summary-from" type="date" value={from} onChange={event => { const nextFrom = event.target.value; setFrom(nextFrom); if (to && nextFrom > to) setTo(''); }} aria-invalid={Boolean(from && to && to < from)} /></div><div className="w-full space-y-1 sm:w-36"><Label htmlFor="summary-to">To</Label><Input id="summary-to" type="date" min={from || undefined} value={to} disabled={!from} onChange={event => setTo(event.target.value)} aria-invalid={Boolean(from && to && to < from)} /></div>{from && to && to < from && <p role="alert" className="w-full text-sm text-destructive">To date must be on or after the From date.</p>}</>}
      <div className="w-full space-y-1 sm:w-48"><Label htmlFor="summary-owner">Owner</Label><select id="summary-owner" value={ownerId} onChange={event => setOwnerId(event.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="ALL">All owners</option>{owners.map(owner => <option key={owner.id} value={owner.id}>{owner.name}</option>)}</select></div>
      <Button onClick={applyFilters} disabled={period === 'CUSTOM' && (!from || !to || to < from)}><CalendarDays className="mr-2 size-4" />Apply filters</Button>
      <div className="relative w-full sm:w-60 sm:flex-none"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input aria-label="Search opportunities in report" className="pl-9" placeholder="Search opportunity or client…" value={search} onChange={event => setSearch(event.target.value)} /></div>
      <div className="ml-auto flex items-center gap-3">
        <p className="whitespace-nowrap text-sm text-muted-foreground">{filtered.length} opportunit{filtered.length === 1 ? 'y' : 'ies'}</p>
        <Button className="whitespace-nowrap" onClick={downloadReport} disabled={!filtered.length}><Download className="mr-2 size-4" />Download CSV</Button>
      </div>
    </section>
    <div className="overflow-x-auto rounded-xl border bg-card shadow-sm"><Table className="min-w-[1050px]"><TableHeader className="bg-muted/60"><TableRow><TableHead>Opportunity Name</TableHead><TableHead>Client</TableHead><TableHead>Owner</TableHead><TableHead>Stage</TableHead><TableHead>Client Budget</TableHead><TableHead className="text-center">Estimate Value</TableHead><TableHead>Status</TableHead><TableHead className="text-right">View</TableHead></TableRow></TableHeader><TableBody>
      {filtered.map(item => <TableRow key={item.opportunityId}><TableCell className="max-w-[250px] font-semibold"><span className="block truncate" title={item.opportunityName ?? ''}>{item.opportunityName || item.opportunityNumber || 'Untitled opportunity'}</span><span className="text-xs font-normal text-muted-foreground">{item.opportunityNumber}</span></TableCell><TableCell>{item.clientName || '—'}</TableCell><TableCell>{owners.find(person => person.id === String(item.ownerId))?.name ?? 'Unassigned'}</TableCell><TableCell>{item.stageName || (item.stageId == null ? 'Stage unavailable' : `Stage ${item.stageId}`)}</TableCell><TableCell className="whitespace-nowrap tabular-nums">{money(item.estimatedValueUsd)}</TableCell><TableCell className="whitespace-nowrap text-center tabular-nums">{item.stageId != null && item.stageId >= 5 ? money(item.submittedEstimateUsd) : '—'}</TableCell><TableCell><Badge variant={reportStatus(item.stageId) === 'Won' ? 'success' : reportStatus(item.stageId) === 'Lost' || reportStatus(item.stageId) === 'No-Bid / Declined' ? 'critical' : 'muted'}>{reportStatus(item.stageId)}</Badge></TableCell><TableCell className="text-right"><Button size="sm" variant="outline" onClick={() => setSelected(item)}><Eye className="mr-1.5 size-3.5" />View</Button></TableCell></TableRow>)}
      {!filtered.length && <TableRow><TableCell colSpan={8} className="h-28 text-center text-muted-foreground">No opportunities match the selected filters.</TableCell></TableRow>}
    </TableBody></Table></div>
    <OpportunityReportDrawer opportunity={selected} onClose={() => setSelected(null)} />
  </div>;
}
