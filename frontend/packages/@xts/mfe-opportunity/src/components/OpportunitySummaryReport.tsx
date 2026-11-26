import { gql, useQuery } from '@apollo/client';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Briefcase, Building2, CalendarDays, ClipboardList, Eye, FileText, Filter, HelpCircle, Search, ShieldAlert, Table2, Users } from 'lucide-react';
import { Badge, Button, Input, Label, ReportCardHeader, REPORT_CARD_SHADOW, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tabs, TabsContent, TabsList, TabsTrigger, useSetPageTitle, downloadExcel, downloadPdf, type ExportColumn, type ExportTable } from '@xts/design-system';
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

export interface ReportOpportunity {
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
  if (period === 'THIS_YEAR') {
    const startYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    return { from: dateString(new Date(startYear, 3, 1)), to: dateString(new Date(startYear + 1, 2, 31)) };
  }
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
const SUMMARY_EXPORT_COLUMNS: ExportColumn[] = [
  { header: 'Sr. No.', align: 'center', excelWidth: 9, pdfWeight: 0.7 },
  { header: 'Opportunity Name', align: 'left', excelWidth: 30, pdfWeight: 2.4 },
  { header: 'Client', align: 'left', excelWidth: 24, pdfWeight: 1.8 },
  { header: 'Owner', align: 'left', excelWidth: 24, pdfWeight: 1.7 },
  { header: 'Stage', align: 'left', excelWidth: 26, pdfWeight: 1.8 },
  { header: 'Substage', align: 'left', excelWidth: 26, pdfWeight: 1.8 },
  { header: 'Client Budget (USD)', align: 'right', excelWidth: 20, pdfWeight: 1.5, currency: true },
  { header: 'Estimate Value (USD)', align: 'right', excelWidth: 20, pdfWeight: 1.5, currency: true },
  { header: 'Status', align: 'left', excelWidth: 20, pdfWeight: 1.3 },
];

function Field({ label, children }: { label: string; children?: ReactNode }) {
  return <div className="min-w-0 rounded-lg border border-slate-200 bg-gradient-to-br from-background to-slate-50/80 px-3 py-2.5 shadow-sm"><p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p><div className="mt-1 break-words text-sm font-medium text-foreground">{children ?? 'Not provided'}</div></div>;
}

const reportSectionTones = {
  indigo: 'border-indigo-200 bg-indigo-50/40', emerald: 'border-emerald-200 bg-emerald-50/40', sky: 'border-sky-200 bg-sky-50/40',
  violet: 'border-violet-200 bg-violet-50/40', teal: 'border-teal-200 bg-teal-50/40', amber: 'border-amber-200 bg-amber-50/40',
  rose: 'border-rose-200 bg-rose-50/40', cyan: 'border-cyan-200 bg-cyan-50/40',
};
const reportSectionIcons = {
  indigo: 'bg-indigo-100 text-indigo-700', emerald: 'bg-emerald-100 text-emerald-700', sky: 'bg-sky-100 text-sky-700',
  violet: 'bg-violet-100 text-violet-700', teal: 'bg-teal-100 text-teal-700', amber: 'bg-amber-100 text-amber-700',
  rose: 'bg-rose-100 text-rose-700', cyan: 'bg-cyan-100 text-cyan-700',
};
function ReportSection({ title, icon: Icon, tone, children }: { title: string; icon: typeof Briefcase; tone: keyof typeof reportSectionTones; children: ReactNode }) {
  return <section className={`overflow-hidden rounded-xl border shadow-sm ${reportSectionTones[tone]}`}>
    <header className="flex items-center gap-2 border-b border-inherit bg-background/70 px-3 py-2.5">
      <span className={`grid size-8 shrink-0 place-items-center rounded-lg ${reportSectionIcons[tone]}`}><Icon className="size-4" aria-hidden="true" /></span>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
    </header>
    <div className="space-y-3 p-3">{children}</div>
  </section>;
}

export function OpportunityReportDrawer({ opportunity, onClose }: { opportunity: ReportOpportunity | null; onClose: () => void }) {
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
  const sourceDocument = detail.form.rfp.source;
  const reportDocuments = [
    ...(sourceDocument ? [sourceDocument] : []),
    ...documents.filter(document => !sourceDocument || (document.id !== sourceDocument.id && (!sourceDocument.storagePath || document.storagePath !== sourceDocument.storagePath))),
  ];
  return <Tabs defaultValue="details" className="flex min-h-0 flex-1 flex-col">
    <div className="border-b px-4 pt-3"><TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto bg-transparent p-0">
      {[['details', 'Opportunity details'], ['qa', 'RFP Q&A'], ['scope', 'Scope & assessment'], ['estimate', 'Estimate'], ['documents', 'Documents']].map(([value, label]) => <TabsTrigger key={value} value={value} className="shrink-0">{label}</TabsTrigger>)}
    </TabsList></div>
    <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
      <TabsContent value="details" className="mt-0 space-y-3">
        <ReportSection title="Opportunity details" icon={Briefcase} tone="indigo"><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Opportunity name">{detail.title}</Field><Field label="Reference">{detail.number}</Field><Field label="Stage">{detail.stageName || detail.stageId && `Stage ${detail.stageId}`}</Field><Field label="Substage">{detail.subStageName}</Field><Field label="Status"><Badge variant={detail.stageId === 7 ? 'success' : detail.stageId === 8 || detail.stageId === 9 ? 'critical' : 'info'}>{reportStatus(detail.stageId)}</Badge></Field><Field label="Owner">{detail.owner?.name}</Field><Field label="Client budget (USD)">{money(detail.estimatedValueUsd ? Number(detail.estimatedValueUsd) : null)}</Field><Field label="Priority">{detail.priority}</Field><Field label="Submission deadline">{detail.submissionDeadline}</Field><Field label="Description">{detail.form.description}</Field>{detail.form.rfp.source && <Field label="Source document"><DocumentDownload document={detail.form.rfp.source} opportunityId={detail.id} /></Field>}
        </div></ReportSection>
        <ReportSection title="Client & contacts" icon={Users} tone="emerald">{detail.client ? <div className="grid gap-2 sm:grid-cols-2">
          <Field label="Client">{detail.client.name}</Field><Field label="Account type">{detail.client.accountTypeName}</Field><Field label="Sector / industry">{detail.client.industryName}</Field><Field label="Website">{detail.client.website}</Field><Field label="Address">{[detail.client.streetAddress, detail.client.city, detail.client.stateProvince, detail.client.country].filter(Boolean).join(', ')}</Field>
          {[detail.client.primaryContact, ...detail.client.additionalContacts].map((contact, index) => <Field key={`${contact.email}-${index}`} label={index === 0 ? 'Primary contact' : `Additional contact ${index}`}>
            {[contact.name, contact.title, contact.email, contact.phone].filter(Boolean).join(' · ')}
          </Field>)}
        </div> : <p className="rounded-lg border border-dashed bg-background/70 p-4 text-sm text-muted-foreground">No client linked.</p>}</ReportSection>
        <ReportSection title="Solicitation details" icon={CalendarDays} tone="sky"><div className="grid gap-2 sm:grid-cols-2">
          <Field label="Solicitation / reference number">{detail.form.solicitation.reference}</Field><Field label="Issuing agency / department">{detail.form.solicitation.issuingAgency}</Field><Field label="Procurement contact">{detail.form.solicitation.procurementContact}</Field><Field label="Submission method">{detail.form.solicitation.submissionMethod}</Field><Field label="Questions due">{detail.form.dates.questionsDue}</Field><Field label="Submission deadline">{detail.form.dates.submissionDeadline}</Field>{questionnaire && <><Field label="Contract term">{detail.form.solicitation.contractTerm}</Field><Field label="Incumbent vendor">{detail.form.solicitation.incumbentVendor}</Field></>}
        </div></ReportSection>
      </TabsContent>
      <TabsContent value="qa" className="mt-0 space-y-3">{responses.length ? responseGroups.map(group => <ReportSection key={group.category || 'all-questions'} title={questionnaire ? group.category : 'Questions & answers'} icon={HelpCircle} tone="violet"><div className="space-y-2">{group.items.map(response => { questionNumber += 1; return <article key={response.id} className="rounded-xl border border-violet-100 bg-background p-3 shadow-sm sm:p-4"><div className="flex items-start gap-3"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-violet-100 text-xs font-bold text-violet-700">{questionNumber}</span><div className="min-w-0 flex-1"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Question {questionNumber}</p><h4 className="mt-1 font-semibold text-foreground">{response.title}</h4><div className="mt-3 rounded-lg bg-muted/50 p-3"><p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Answer</p><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-foreground">{response.answer || 'No answer provided.'}</p></div></div></div></article>; })}</div></ReportSection>) : <div className="rounded-xl border border-dashed bg-muted/20 p-8 text-center"><span className="mx-auto grid size-10 place-items-center rounded-xl bg-violet-100 text-violet-700"><HelpCircle className="size-5" /></span><p className="mt-3 text-sm font-semibold">No RFP questions or answers</p><p className="mt-1 text-sm text-muted-foreground">There are no saved questions for this opportunity.</p></div>}</TabsContent>
      <TabsContent value="scope" className="mt-0 space-y-3">{detail.scope ? <>
        <ReportSection title="Scope" icon={ClipboardList} tone="rose"><p className="whitespace-pre-wrap break-words text-sm leading-6 text-foreground">{detail.scope.summary || 'No scope summary provided.'}</p></ReportSection>
        <ReportSection title="Alignment" icon={Building2} tone="teal">{detail.scope.alignment.length ? <ul className="space-y-2">{detail.scope.alignment.map(item => <li key={item.id} className="flex items-start gap-2 rounded-lg border bg-background p-3 text-sm leading-6"><span className="mt-2 size-2 shrink-0 rounded-full bg-teal-500" /><span>{item.text}</span></li>)}</ul> : <p className="rounded-lg border border-dashed bg-background p-4 text-sm text-muted-foreground">No alignment details provided.</p>}</ReportSection>
        <ReportSection title="Risks" icon={ShieldAlert} tone="amber">{detail.scope.risks.length ? <ul className="space-y-2">{detail.scope.risks.map(item => <li key={item.id} className="flex items-start justify-between gap-3 rounded-lg border bg-background p-3"><span className="text-sm leading-6">{item.description}</span><Badge variant={item.severity === 'HIGH' ? 'critical' : 'muted'}>{item.severity}</Badge></li>)}</ul> : <p className="rounded-lg border border-dashed bg-background p-4 text-sm text-muted-foreground">No risks recorded.</p>}</ReportSection>
      </> : <div className="rounded-xl border border-dashed bg-muted/20 p-8 text-center"><span className="mx-auto grid size-10 place-items-center rounded-xl bg-rose-100 text-rose-700"><ClipboardList className="size-5" /></span><p className="mt-3 text-sm font-semibold">No saved scope and assessment</p></div>}</TabsContent>
      <TabsContent value="estimate" className="mt-0 space-y-3">{selectedEstimation ? <><ReportSection title="Approved estimate value" icon={Table2} tone="amber"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Estimate total</p><p className="mt-1 text-2xl font-bold tabular-nums text-amber-800">{money(Number(selectedEstimation.total))}</p></div><Badge variant="warning">USD</Badge></div></ReportSection><div className="rounded-xl border bg-card p-3 shadow-sm"><SavedEstimationBreakdown estimation={selectedEstimation} /></div></> : <div className="rounded-xl border border-dashed bg-muted/20 p-8 text-center"><span className="mx-auto grid size-10 place-items-center rounded-xl bg-amber-100 text-amber-700"><Table2 className="size-5" /></span><p className="mt-3 text-sm font-semibold">No saved estimate</p><p className="mt-1 text-sm text-muted-foreground">An estimate has not been saved for this opportunity.</p></div>}</TabsContent>
      <TabsContent value="documents" className="mt-0">{documentsLoading ? <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">Loading documents…</div> : documentsError ? <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{documentsError}</div> : reportDocuments.length ? <ReportSection title="Opportunity documents" icon={FileText} tone="cyan"><div className="space-y-2">{reportDocuments.map(document => <div key={document.id} className="flex flex-col gap-3 rounded-xl border bg-background p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 items-center gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-cyan-100 text-cyan-700"><FileText className="size-5" /></span><div className="min-w-0"><p className="truncate text-sm font-semibold" title={document.title || document.name}>{document.title || document.name}</p><p className="mt-0.5 text-xs text-muted-foreground">{sourceDocument?.id === document.id ? 'Source document' : 'Attached document'}{document.type ? ` · ${document.type}` : ''}</p></div></div><DocumentDownload document={document} opportunityId={detail.id} showLabel /></div>)}</div></ReportSection> : <div className="rounded-xl border border-dashed bg-muted/20 p-8 text-center"><span className="mx-auto grid size-10 place-items-center rounded-xl bg-cyan-100 text-cyan-700"><FileText className="size-5" /></span><p className="mt-3 text-sm font-semibold">No documents attached</p><p className="mt-1 text-sm text-muted-foreground">There are no downloadable documents for this opportunity.</p></div>}</TabsContent>
    </div>
  </Tabs>;
}

export function OpportunitySummaryReport() {
  useSetPageTitle('Opportunity Summary Report');
  const access = useOpportunityAccess();
  const report = useQuery<{ opportunities: ReportOpportunity[] }>(OPPORTUNITY_SUMMARY_QUERY, { fetchPolicy: 'cache-and-network' });
  const directory = useQuery<OwnerDirectoryData>(GET_OPPORTUNITY_OWNER_DIRECTORY, { fetchPolicy: 'cache-and-network' });
  const owners = useMemo(() => mapOwnerDirectory(directory.data), [directory.data]);
  const initialRange = periodRange('THIS_YEAR');
  const [period, setPeriod] = useState('THIS_YEAR');
  const [from, setFrom] = useState(initialRange.from), [to, setTo] = useState(initialRange.to);
  const [ownerId, setOwnerId] = useState('ALL'), [search, setSearch] = useState('');
  const [applied, setApplied] = useState({ from: initialRange.from, to: initialRange.to, ownerId: 'ALL', period: 'THIS_YEAR' });
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
  function applyFilters() { setApplied({ from, to, ownerId, period }); }
  const appliedPeriod = { start: new Date(`${applied.from}T00:00:00`), end: new Date(`${applied.to}T23:59:59`) };
  const buildExport = (): ExportTable => {
    const rangeLabel = applied.period === 'THIS_YEAR' ? 'This Year' : applied.period === 'LAST_QUARTER' ? 'Last Quarter' : applied.period === 'CUSTOM' ? 'Custom Range' : 'This Quarter';
    const ownerLabel = applied.ownerId === 'ALL' ? 'All Owners' : owners.find(person => person.id === applied.ownerId)?.name ?? 'Selected Owner';
    return {
      title: 'Opportunity Summary Report',
      subtitle: [
        `Range: ${rangeLabel} (${applied.from} – ${applied.to})`,
        `Owner: ${ownerLabel}`,
        `Search: ${search.trim() || 'All Opportunities'}`,
      ],
      columns: SUMMARY_EXPORT_COLUMNS,
      rows: filtered.map((item, index) => [
        index + 1,
        item.opportunityName || item.opportunityNumber || 'Untitled opportunity',
        item.clientName || '—',
        owners.find(person => person.id === String(item.ownerId))?.name ?? 'Unassigned',
        item.stageName || (item.stageId == null ? 'Stage unavailable' : `Stage ${item.stageId}`),
        item.subStageName || '—',
        item.estimatedValueUsd,
        item.stageId != null && item.stageId >= 5 ? item.submittedEstimateUsd : null,
        reportStatus(item.stageId),
      ]),
      fileName: `Opportunity_Summary_Report_${applied.from}_to_${applied.to}`,
    };
  };

  if (!access.view) return <div className="p-6"><Notice error="You do not have permission to view opportunity reports." /></div>;
  if (report.loading && !report.data) return <div className="p-6"><Loading /></div>;
  if (report.error) return <div className="p-6"><Notice error={report.error} retry={() => void report.refetch()} /></div>;
  const customInvalid = period === 'CUSTOM' && (!from || !to || to < from);
  const customError = period === 'CUSTOM' && from && to && to < from ? 'Start Date cannot be later than End Date.' : null;
  return <div className="flex h-full min-h-0 flex-col gap-6 overflow-hidden p-6 lg:p-8">
    <div className={`z-10 shrink-0 card-surface overflow-hidden bg-background ${REPORT_CARD_SHADOW}`}>
      <ReportCardHeader icon={Filter} title="Filters" />
      <form className="flex flex-wrap items-end gap-4 p-6" onSubmit={event => { event.preventDefault(); if (!customInvalid) applyFilters(); }}>
        <div className="grid w-full gap-1.5 sm:w-48">
          <Label htmlFor="summary-period">Range</Label>
          <Select value={period} onValueChange={changePeriod}>
            <SelectTrigger id="summary-period" className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="THIS_YEAR">This Year</SelectItem>
              <SelectItem value="THIS_QUARTER">This Quarter</SelectItem>
              <SelectItem value="LAST_QUARTER">Last Quarter</SelectItem>
              <SelectItem value="CUSTOM">Custom Range</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {period === 'CUSTOM' && <>
          <div className="grid w-full gap-1.5 sm:w-44">
            <Label htmlFor="summary-from">Start Date</Label>
            <Input id="summary-from" type="date" className="h-9" value={from} onChange={event => { const nextFrom = event.target.value; setFrom(nextFrom); if (to && nextFrom > to) setTo(''); }} />
          </div>
          <div className="grid w-full gap-1.5 sm:w-44">
            <Label htmlFor="summary-to">End Date</Label>
            <Input id="summary-to" type="date" className="h-9" value={to} min={from || undefined} disabled={!from} onChange={event => setTo(event.target.value)} />
          </div>
        </>}
        <div className="grid w-full gap-1.5 sm:w-64">
          <Label htmlFor="summary-owner">Owner</Label>
          <Select value={ownerId} onValueChange={setOwnerId}>
            <SelectTrigger id="summary-owner" className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Owners</SelectItem>
              {owners.map(owner => <SelectItem key={owner.id} value={owner.id}>{owner.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" className="h-9 px-6" disabled={customInvalid}>Apply</Button>
        <div className="relative w-full sm:w-60 sm:flex-none">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input aria-label="Search opportunities in report" className="h-9 pl-9" placeholder="Search opportunity or client…" value={search} onChange={event => setSearch(event.target.value)} />
        </div>
        {customError && <p className="w-full text-sm text-destructive">{customError}</p>}
      </form>
    </div>
    <div className={`flex min-h-0 flex-1 flex-col overflow-hidden card-surface ${REPORT_CARD_SHADOW}`}>
      <ReportCardHeader
        icon={Table2}
        title="Opportunity Summary"
        period={appliedPeriod}
        onExcel={() => downloadExcel(buildExport())}
        onPdf={() => downloadPdf(buildExport())}
        exportDisabled={filtered.length === 0}
      />
      <div className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex h-full min-w-[1462px] flex-col">
          <Table className="w-full table-fixed"><colgroup><col style={{ width: 56 }} /><col style={{ width: 220 }} /><col style={{ width: 140 }} /><col style={{ width: 160 }} /><col style={{ width: 240 }} /><col style={{ width: 180 }} /><col style={{ width: 140 }} /><col style={{ width: 140 }} /><col style={{ width: 130 }} /><col style={{ width: 56 }} /></colgroup><TableHeader><TableRow style={{ background: 'linear-gradient(90deg, hsl(var(--primary) / 0.12), hsl(var(--primary) / 0.04))' }}>
            <TableHead className="text-center">Sr. No.</TableHead><TableHead>Opportunity Name</TableHead><TableHead>Client</TableHead><TableHead>Owner</TableHead><TableHead>Stage</TableHead><TableHead>Substage</TableHead><TableHead>Client Budget</TableHead><TableHead className="text-center">Estimate Value</TableHead><TableHead>Status</TableHead><TableHead className="text-center">View</TableHead>
          </TableRow></TableHeader></Table>
          <div className="min-h-0 flex-1 overflow-y-auto">
          <Table className="w-full table-fixed"><colgroup><col style={{ width: 56 }} /><col style={{ width: 220 }} /><col style={{ width: 140 }} /><col style={{ width: 160 }} /><col style={{ width: 240 }} /><col style={{ width: 180 }} /><col style={{ width: 140 }} /><col style={{ width: 140 }} /><col style={{ width: 130 }} /><col style={{ width: 56 }} /></colgroup><TableBody>
          {filtered.map((item, index) => <TableRow key={item.opportunityId}>
            <TableCell className="text-center tabular-nums text-muted-foreground">{index + 1}</TableCell>
            <TableCell className="max-w-[250px] font-semibold"><span className="block truncate" title={item.opportunityName ?? ''}>{item.opportunityName || item.opportunityNumber || 'Untitled opportunity'}</span><span className="text-xs font-normal text-muted-foreground">{item.opportunityNumber}</span></TableCell>
            <TableCell>{item.clientName || '—'}</TableCell>
            <TableCell>{owners.find(person => person.id === String(item.ownerId))?.name ?? 'Unassigned'}</TableCell>
            <TableCell>{item.stageName || (item.stageId == null ? 'Stage unavailable' : `Stage ${item.stageId}`)}</TableCell>
            <TableCell>{item.subStageName || '—'}</TableCell>
            <TableCell className="whitespace-nowrap tabular-nums">{money(item.estimatedValueUsd)}</TableCell>
            <TableCell className="whitespace-nowrap text-center tabular-nums">{item.stageId != null && item.stageId >= 5 ? money(item.submittedEstimateUsd) : '—'}</TableCell>
            <TableCell><Badge variant={reportStatus(item.stageId) === 'Won' ? 'success' : reportStatus(item.stageId) === 'Lost' || reportStatus(item.stageId) === 'No-Bid / Declined' ? 'critical' : 'muted'}>{reportStatus(item.stageId)}</Badge></TableCell>
            <TableCell className="text-center"><Button size="icon" variant="outline" className="size-8" aria-label={`View ${item.opportunityName || item.opportunityNumber || 'opportunity'}`} title="View opportunity details" onClick={() => setSelected(item)}><Eye className="size-4" /></Button></TableCell>
          </TableRow>)}
          {!filtered.length && <TableRow><TableCell colSpan={10} className="h-28 text-center text-muted-foreground">No opportunities match the selected filters.</TableCell></TableRow>}
          </TableBody></Table>
          </div>
        </div>
      </div>
    </div>
    <OpportunityReportDrawer opportunity={selected} onClose={() => setSelected(null)} />
  </div>;
}
