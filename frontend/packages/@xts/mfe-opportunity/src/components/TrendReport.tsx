import { gql, useQuery } from '@apollo/client';
import { useMemo, useState } from 'react';
import { BarChart3 } from 'lucide-react';
import {
  ReportCardHeader,
  filterReportRows,
  ReportFiltersCard,
  REPORT_CARD_SHADOW,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  downloadExcel,
  downloadPdf,
  formatReportDate,
  isoReportDate,
  resolveReportRange,
  useSetPageTitle,
  type ExportColumn,
  type ExportTable,
  type ReportFilterValues,
} from '@xts/design-system';
import { useOpportunityAccess } from '../hooks/useOpportunityAccess';
import { Loading, Notice } from './ui';

const TREND_REPORT_QUERY = gql`
  query OpportunityTrendReport {
    opportunities(queue: "PIPELINE") {
      createdDt
      isActive
    }
  }
`;

interface TrendOpportunity { createdDt: string | null; isActive: boolean | null; }
interface TrendRow { month: string; quarter: string; count: number; }

const EXPORT_COLUMNS: ExportColumn[] = [
  { header: 'Sr. No.', align: 'center', excelWidth: 9, pdfWeight: 0.7 },
  { header: 'Month', align: 'left', excelWidth: 20, pdfWeight: 1.3 },
  { header: 'Quarter', align: 'center', excelWidth: 14, pdfWeight: 0.9 },
  { header: 'Opportunity Count', align: 'center', excelWidth: 26, pdfWeight: 1.5 },
];

function monthLabel(date: Date) {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function trendRows(opportunities: TrendOpportunity[], applied: ReportFilterValues): TrendRow[] {
  const now = new Date();
  const period = resolveReportRange(applied, now);
  const fyStartYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const fyStart = new Date(fyStartYear, 3, 1);
  const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const rangeStart = period.start > fyStart ? period.start : fyStart;
  const rangeEnd = period.end < now ? period.end : now;
  const firstMonth = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1);
  const lastMonth = new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), 1);
  const cappedLastMonth = lastMonth > currentMonth ? currentMonth : lastMonth;
  if (firstMonth > cappedLastMonth) return [];

  const months: Date[] = [];
  for (const cursor = new Date(firstMonth); cursor <= cappedLastMonth; cursor.setMonth(cursor.getMonth() + 1)) months.push(new Date(cursor));
  const counts = new Map<string, number>(months.map(month => [`${month.getFullYear()}-${month.getMonth()}`, 0]));
  for (const opportunity of opportunities) {
    if (opportunity.isActive === false || !opportunity.createdDt) continue;
    const created = new Date(opportunity.createdDt);
    const timestamp = created.getTime();
    if (!Number.isFinite(timestamp) || timestamp < period.start.getTime() || timestamp > period.end.getTime() || timestamp > now.getTime()) continue;
    const key = `${created.getFullYear()}-${created.getMonth()}`;
    if (counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return months.map(month => {
    const fyMonth = (month.getMonth() + 9) % 12;
    return { month: monthLabel(month), quarter: `Q${Math.floor(fyMonth / 3) + 1}`, count: counts.get(`${month.getFullYear()}-${month.getMonth()}`) ?? 0 };
  });
}

export function TrendReport() {
  useSetPageTitle('Trend Report');
  const access = useOpportunityAccess();
  const report = useQuery<{ opportunities: TrendOpportunity[] }>(TREND_REPORT_QUERY, { fetchPolicy: 'cache-and-network' });
  const [applied, setApplied] = useState<ReportFilterValues>({ range: 'this_year', startDate: '', endDate: '', ownerIds: [], clientIds: [] });
  const period = useMemo(() => resolveReportRange(applied), [applied]);
  const [search, setSearch] = useState('');
  const allRows = useMemo(() => trendRows(report.data?.opportunities ?? [], applied), [report.data, applied]);
  const rows = useMemo(() => filterReportRows(allRows, search, row => `${row.month} ${row.quarter}`), [allRows, search]);
  const exportTable = (): ExportTable => ({
    title: 'Trend Report',
    subtitle: [`Range: ${applied.range.replace(/_/g, ' ')} (${formatReportDate(period.start)} – ${formatReportDate(period.end)})`],
    columns: EXPORT_COLUMNS,
    rows: rows.map((row, index) => [index + 1, row.month, row.quarter, row.count]),
    fileName: `Trend_Report_${isoReportDate(period.start)}_to_${isoReportDate(period.end)}`,
  });

  if (!access.view) return <div className="p-6"><Notice error="You do not have permission to view opportunity reports." /></div>;
  if (report.loading && !report.data) return <div className="p-6"><Loading /></div>;

  return <div className="flex h-full min-h-0 flex-col gap-6 overflow-hidden p-6 lg:p-8">
    <div className="shrink-0"><ReportFiltersCard idPrefix="trend-report" owners={[]} showOwner={false} onApply={setApplied} /></div>
    <div className={`flex min-h-0 flex-1 flex-col overflow-hidden card-surface ${REPORT_CARD_SHADOW}`}>
      <ReportCardHeader icon={BarChart3} title="Opportunities Created by Month" period={period} onExcel={() => downloadExcel(exportTable())} onPdf={() => downloadPdf(exportTable())} exportDisabled={rows.length === 0} search={{ value: search, onChange: setSearch, placeholder: 'Search month or quarter' }} />
      {report.error ? <div className="p-6"><Notice error={report.error.message} retry={() => void report.refetch()} /></div> : report.loading && !report.data ? <div className="space-y-2 p-6">{[0, 1, 2, 3].map(index => <Skeleton key={index} className="h-10 w-full" />)}</div> : <div className="min-h-0 flex-1 overflow-auto">
        <Table className="min-w-[560px]">
          <TableHeader className="sticky top-0 z-10 bg-muted/70"><TableRow>
            <TableHead className="w-[9%] text-center">Sr. No.</TableHead><TableHead className="w-[41%]">Month</TableHead><TableHead className="w-[22%] text-center">Quarter</TableHead><TableHead className="w-[28%] text-center">Opportunity Count</TableHead>
          </TableRow></TableHeader>
          <TableBody>{rows.map((row, index) => <TableRow key={row.month} className={index % 2 ? 'bg-muted/20' : 'bg-background'}>
            <TableCell className="text-center tabular-nums">{index + 1}</TableCell><TableCell className="font-medium">{row.month}</TableCell><TableCell className="text-center"><span className="inline-flex rounded-full border border-primary/15 bg-primary/5 px-2.5 py-1 text-xs font-semibold text-primary">{row.quarter}</span></TableCell><TableCell className="text-center font-semibold tabular-nums">{row.count}</TableCell>
          </TableRow>)}
          {!rows.length && <TableRow><TableCell colSpan={4} className="h-28 text-center text-muted-foreground">No months found for the selected range.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>}
    </div>
  </div>;
}
