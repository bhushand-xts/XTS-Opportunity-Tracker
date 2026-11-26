import { gql, useQuery } from '@apollo/client';
import { useMemo, useState } from 'react';
import { Eye, Filter, Search, Table2 } from 'lucide-react';
import {
  Button, Input, Label, ReportCardHeader, REPORT_CARD_SHADOW,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
  useSetPageTitle, downloadExcel, downloadPdf,
  DEFAULT_REPORT_FILTERS, REPORT_RANGE_OPTIONS, formatReportDate, isoReportDate, resolveReportRange,
  type ExportColumn, type ExportTable, type ReportRangeKey,
} from '@xts/design-system';
import { useOpportunityAccess } from '../hooks/useOpportunityAccess';
import { GET_OPPORTUNITY_OWNER_DIRECTORY, type OwnerDirectoryData } from '../services/userDirectory.queries';
import { Loading, Notice } from './ui';
import { OpportunityReportDrawer, type ReportOpportunity } from './OpportunitySummaryReport';

const PENDING_APPROVALS_QUERY = gql`
  query PendingApprovalsReport {
    opportunities(queue: "PIPELINE") {
      opportunityId opportunityNumber opportunityName clientName ownerId assignedTo
      stageId stageName subStageId subStageName estimatedValueUsd submittedEstimateUsd createdDt updatedDt
      stageHistory { stageId subStageId reachedAt }
    }
  }
`;

interface PendingApprovalOpportunity extends ReportOpportunity {
  assignedTo: number | null;
  updatedDt: string | null;
  stageHistory: { stageId: number; subStageId: number; reachedAt: string }[];
}
interface PendingApprovalRow {
  opportunity: PendingApprovalOpportunity;
  approverGroup: 'SALES_HEAD' | 'CEO';
  level: string;
  approver: string;
  since: string | null;
}

const EXPORT_COLUMNS: ExportColumn[] = [
  { header: 'Sr. No.', align: 'right', excelWidth: 10, pdfWeight: 0.6 },
  { header: 'Opportunity Name', align: 'left', excelWidth: 32, pdfWeight: 2.2 },
  { header: 'Approval Level', align: 'left', excelWidth: 24, pdfWeight: 1.6 },
  { header: 'Approver', align: 'left', excelWidth: 24, pdfWeight: 1.6 },
  { header: 'Pending Since', align: 'left', excelWidth: 18, pdfWeight: 1.2 },
  { header: 'Days Pending', align: 'center', excelWidth: 14, pdfWeight: 0.9 },
];

function approvalDetails(opportunity: PendingApprovalOpportunity): { approverGroup: PendingApprovalRow['approverGroup']; level: string; gateStage: number; gateSubstage: number } | null {
  const { stageId, subStageId } = opportunity;
  if (stageId === 1 && subStageId === 1) return { approverGroup: 'SALES_HEAD', level: 'Sales Head — Pending Review', gateStage: 1, gateSubstage: 1 };
  if (stageId === 2 && subStageId === 4) return { approverGroup: 'CEO', level: 'CEO — Qualifying (Go/No-Go) approval', gateStage: 2, gateSubstage: 4 };
  if (stageId === 4 && subStageId === 5) return { approverGroup: 'CEO', level: 'CEO — Revised estimate approval', gateStage: 4, gateSubstage: 5 };
  if (stageId === 4 && subStageId === 8) return { approverGroup: 'CEO', level: 'CEO — Estimate approval', gateStage: 4, gateSubstage: 8 };
  return null;
}

function daysPending(dateString: string | null) {
  if (!dateString) return null;
  const start = new Date(dateString);
  if (!Number.isFinite(start.getTime())) return null;
  const now = new Date();
  const startDay = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(0, Math.floor((today - startDay) / 86_400_000));
}

function dateLabel(dateString: string | null) {
  if (!dateString) return 'Date unavailable';
  const date = new Date(dateString);
  return Number.isFinite(date.getTime()) ? formatReportDate(date) : 'Date unavailable';
}

export function PendingApprovalsReport() {
  useSetPageTitle('Pending Approvals');
  const access = useOpportunityAccess();
  const report = useQuery<{ opportunities: PendingApprovalOpportunity[] }>(PENDING_APPROVALS_QUERY, { fetchPolicy: 'cache-and-network' });
  const directory = useQuery<OwnerDirectoryData>(GET_OPPORTUNITY_OWNER_DIRECTORY, { fetchPolicy: 'cache-and-network' });
  const activeApprovers = useMemo(() => {
    const activeRoles = (directory.data?.rolesList ?? []).filter((role): role is NonNullable<typeof role> => role !== null && role.isActive === true);
    const roleIds = {
      SALES_HEAD: new Set(activeRoles.filter(role => /sales\s*head/i.test(role.roleName) || /^sh$/i.test(role.roleCode ?? '')).map(role => role.id)),
      CEO: new Set(activeRoles.filter(role => /\bceo\b|chief\s*executive/i.test(role.roleName) || /approver[_-]?gate[_-]?2/i.test(role.roleCode ?? '')).map(role => role.id)),
    };
    const activeUsers = (directory.data?.userList ?? []).filter((user): user is NonNullable<typeof user> => user !== null && user.isActive === true);
    return {
      SALES_HEAD: activeUsers.filter(user => user.roleId !== null && roleIds.SALES_HEAD.has(user.roleId)).map(user => [user.firstName?.trim(), user.lastName?.trim()].filter(Boolean).join(' ') || user.email),
      CEO: activeUsers.filter(user => user.roleId !== null && roleIds.CEO.has(user.roleId)).map(user => [user.firstName?.trim(), user.lastName?.trim()].filter(Boolean).join(' ') || user.email),
    };
  }, [directory.data]);

  const initialPeriod = resolveReportRange(DEFAULT_REPORT_FILTERS);
  const [range, setRange] = useState<ReportRangeKey>(DEFAULT_REPORT_FILTERS.range);
  const [from, setFrom] = useState(isoReportDate(initialPeriod.start));
  const [to, setTo] = useState(isoReportDate(initialPeriod.end));
  const [approver, setApprover] = useState('ALL');
  const [search, setSearch] = useState('');
  const [applied, setApplied] = useState({ from: isoReportDate(initialPeriod.start), to: isoReportDate(initialPeriod.end), approver: 'ALL' });
  const [selected, setSelected] = useState<ReportOpportunity | null>(null);

  const rows = useMemo(() => {
    const rangePeriod = { start: new Date(`${applied.from}T00:00:00`), end: new Date(`${applied.to}T23:59:59.999`) };
    const term = search.trim().toLowerCase();
    return (report.data?.opportunities ?? []).flatMap(opportunity => {
      const approval = approvalDetails(opportunity);
      if (!approval) return [];
      const matchingHistory = [...(opportunity.stageHistory ?? [])]
        .filter(entry => entry.stageId === approval.gateStage && entry.subStageId === approval.gateSubstage)
        .sort((a, b) => Date.parse(b.reachedAt) - Date.parse(a.reachedAt))[0];
      const since = matchingHistory?.reachedAt ?? opportunity.updatedDt ?? opportunity.createdDt;
      const approverName = [...new Set(activeApprovers[approval.approverGroup])].join(', ')
        || (approval.approverGroup === 'SALES_HEAD' ? 'No active Sales Head user' : 'No active CEO user');
      const levelMatch = applied.approver === 'ALL' || applied.approver === approval.approverGroup;
      const dateMatch = Boolean(since && new Date(since).getTime() >= rangePeriod.start.getTime() && new Date(since).getTime() <= rangePeriod.end.getTime());
      const searchMatch = !term || `${opportunity.opportunityName ?? ''} ${opportunity.opportunityNumber ?? ''} ${opportunity.clientName ?? ''} ${approval.level} ${approverName}`.toLowerCase().includes(term);
      if (!levelMatch || !dateMatch || !searchMatch) return [];
      return [{ opportunity, approverGroup: approval.approverGroup, level: approval.level, approver: approverName, since }];
    }).sort((a, b) => (b.since ? Date.parse(b.since) : 0) - (a.since ? Date.parse(a.since) : 0));
  }, [report.data, activeApprovers, applied, search]);

  function changeRange(value: ReportRangeKey) {
    setRange(value);
    if (value === 'custom') {
      setFrom('');
      setTo('');
      return;
    }
    const next = resolveReportRange({ ...DEFAULT_REPORT_FILTERS, range: value });
    setFrom(isoReportDate(next.start));
    setTo(isoReportDate(next.end));
  }

  const customInvalid = range === 'custom' && (!from || !to || to < from);
  const customError = range === 'custom' && from && to && to < from ? 'Start Date cannot be later than End Date.' : null;
  const appliedPeriod = { start: new Date(`${applied.from}T00:00:00`), end: new Date(`${applied.to}T23:59:59.999`) };
  const approverLabel = applied.approver === 'ALL' ? 'All Approvers' : applied.approver === 'SALES_HEAD' ? 'Sales Head' : 'CEO';
  const exportTable = (): ExportTable => ({
    title: 'Pending Approvals Report',
    subtitle: [`Range: ${formatReportDate(appliedPeriod.start)} – ${formatReportDate(appliedPeriod.end)}`, `Approver: ${approverLabel}`, `Search: ${search.trim() || 'All Pending Approvals'}`],
    columns: EXPORT_COLUMNS,
    rows: rows.map((row, index) => [index + 1, row.opportunity.opportunityName || row.opportunity.opportunityNumber || 'Untitled opportunity', row.level, row.approver, row.since ? dateLabel(row.since) : null, daysPending(row.since)]),
    fileName: `Pending_Approvals_Report_${applied.from}_to_${applied.to}`,
  });

  if (!access.view) return <div className="p-6"><Notice error="You do not have permission to view opportunity reports." /></div>;
  if (report.loading && !report.data) return <div className="p-6"><Loading /></div>;
  if (report.error) return <div className="p-6"><Notice error={report.error.message} retry={() => void report.refetch()} /></div>;

  return <div className="flex h-full min-h-0 flex-col gap-6 overflow-hidden p-6 lg:p-8">
    <div className={`shrink-0 card-surface overflow-hidden bg-background ${REPORT_CARD_SHADOW}`}>
      <ReportCardHeader icon={Filter} title="Filters" />
      <form className="flex flex-wrap items-end gap-4 p-6" onSubmit={event => { event.preventDefault(); if (!customInvalid) setApplied({ from, to, approver }); }}>
        <div className="grid w-full gap-1.5 sm:w-48">
          <Label htmlFor="pending-range">Range</Label>
          <Select value={range} onValueChange={value => changeRange(value as ReportRangeKey)}>
            <SelectTrigger id="pending-range" className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>{REPORT_RANGE_OPTIONS.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        {range === 'custom' && <>
          <div className="grid w-full gap-1.5 sm:w-44"><Label htmlFor="pending-from">Start Date</Label><Input id="pending-from" type="date" className="h-9" value={from} onChange={event => { const next = event.target.value; setFrom(next); if (to && next > to) setTo(''); }} /></div>
          <div className="grid w-full gap-1.5 sm:w-44"><Label htmlFor="pending-to">End Date</Label><Input id="pending-to" type="date" className="h-9" value={to} min={from || undefined} disabled={!from} onChange={event => setTo(event.target.value)} /></div>
        </>}
        <div className="grid w-full gap-1.5 sm:w-64">
          <Label htmlFor="pending-approver">Approver</Label>
          <Select value={approver} onValueChange={setApprover}>
            <SelectTrigger id="pending-approver" className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="ALL">All Approvers</SelectItem><SelectItem value="SALES_HEAD">Sales Head</SelectItem><SelectItem value="CEO">CEO</SelectItem></SelectContent>
          </Select>
        </div>
        <Button type="submit" className="h-9 px-6" disabled={customInvalid}>Apply</Button>
        <div className="relative w-full sm:w-60 sm:flex-none"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input aria-label="Search pending approvals" className="h-9 pl-9" placeholder="Search opportunity or approver…" value={search} onChange={event => setSearch(event.target.value)} /></div>
        {customError && <p className="w-full text-sm text-destructive">{customError}</p>}
      </form>
    </div>
    <div className={`flex min-h-0 flex-1 flex-col overflow-hidden card-surface ${REPORT_CARD_SHADOW}`}>
      <ReportCardHeader icon={Table2} title="Pending Approvals" period={appliedPeriod} onExcel={() => downloadExcel(exportTable())} onPdf={() => downloadPdf(exportTable())} exportDisabled={rows.length === 0} />
      <div className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex h-full min-w-[1180px] flex-col">
          <Table className="w-full table-fixed"><colgroup><col style={{ width: 76 }} /><col style={{ width: 300 }} /><col style={{ width: 300 }} /><col style={{ width: 220 }} /><col style={{ width: 180 }} /><col style={{ width: 130 }} /><col style={{ width: 60 }} /></colgroup><TableHeader><TableRow style={{ background: 'linear-gradient(90deg, hsl(var(--primary) / 0.12), hsl(var(--primary) / 0.04))' }}>
            <TableHead className="text-right">Sr. No.</TableHead><TableHead>Opportunity Name</TableHead><TableHead>Approval Level</TableHead><TableHead>Approver</TableHead><TableHead>Pending Since</TableHead><TableHead className="text-center">Days Pending</TableHead><TableHead className="text-center">View</TableHead>
          </TableRow></TableHeader></Table>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <Table className="w-full table-fixed"><colgroup><col style={{ width: 76 }} /><col style={{ width: 300 }} /><col style={{ width: 300 }} /><col style={{ width: 220 }} /><col style={{ width: 180 }} /><col style={{ width: 130 }} /><col style={{ width: 60 }} /></colgroup><TableBody>
              {rows.map((row, index) => <TableRow key={row.opportunity.opportunityId}>
                <TableCell className="text-right tabular-nums">{index + 1}</TableCell>
                <TableCell className="font-semibold">{row.opportunity.opportunityName || row.opportunity.opportunityNumber || 'Untitled opportunity'}</TableCell>
                <TableCell>{row.level}</TableCell><TableCell>{row.approver}</TableCell><TableCell>{dateLabel(row.since)}</TableCell>
                <TableCell className="text-center tabular-nums">{daysPending(row.since) ?? '—'}{daysPending(row.since) === null ? '' : ' days'}</TableCell>
                <TableCell className="text-center"><Button size="icon" variant="outline" className="size-8" aria-label={`View ${row.opportunity.opportunityName || 'opportunity'}`} title="View opportunity details" onClick={() => setSelected(row.opportunity)}><Eye className="size-4" /></Button></TableCell>
              </TableRow>)}
              {!rows.length && <TableRow><TableCell colSpan={7} className="h-28 text-center text-muted-foreground">No pending approvals match the selected filters.</TableCell></TableRow>}
            </TableBody></Table>
          </div>
        </div>
      </div>
    </div>
    <OpportunityReportDrawer opportunity={selected} onClose={() => setSelected(null)} />
  </div>;
}
