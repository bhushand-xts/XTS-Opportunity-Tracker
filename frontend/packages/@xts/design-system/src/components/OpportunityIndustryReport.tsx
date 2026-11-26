import { useMemo, useState } from "react";
import { gql, useQuery } from "@apollo/client";
import { Building2 } from "lucide-react";
import { Skeleton } from "./ui/skeleton";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "./ui/table";
import {
  DEFAULT_REPORT_FILTERS,
  REPORT_CARD_SHADOW,
  ReportCardHeader,
  filterReportRows,
  ReportFiltersCard,
  isWithinReportRange,
  isoReportDate,
  reportFilterSummary,
  reportOwnerOptions,
  resolveReportRange,
  type ReportFilterValues,
  type ReportUser,
} from "./ReportFilters";
import { useAuth } from "@/lib/auth";
import { useSetPageTitle } from "@/lib/pageTitle";
import { formatMoney } from "@/lib/store";
import { downloadExcel, downloadPdf, type ExportColumn, type ExportTable } from "@/lib/reportExport";

// Reports > Opportunity by Industry Report (mst_menus.menu_key below).
// Opportunities created in the selected range, grouped by the client's
// industry: count, Won / Lost / No Bid / Open, and the Won and Lost value.
// Values are the final estimate — the estimation team's submitted, selected
// estimate (submittedEstimateUsd) — the same figure the dashboard uses.
export const OPPORTUNITY_INDUSTRY_REPORT_MENU_KEY = "opportunity_industry_report";
export const OPPORTUNITY_INDUSTRY_REPORT_PATH = "/reports/opportunity-industry";

const INDUSTRY_REPORT_QUERY = gql`
  query OpportunityIndustryReportData($queue: String = "PIPELINE") {
    opportunities(queue: $queue) {
      opportunityId
      stageId
      sector
      ownerId
      submittedEstimateUsd
      createdDt
      isActive
    }
    userList { id firstName lastName }
  }
`;

interface IndustryOpportunity {
  opportunityId: number;
  stageId: number | null;
  sector: string | null;
  ownerId: number | null;
  submittedEstimateUsd: number | null;
  createdDt: string;
  isActive: boolean;
}

// Same stage ids as the dashboard (mst_stage): 7 Won, 8 Lost, 9 No-Bid /
// Declined. Open = anything not closed in one of those three.
const WON_STAGE_ID = 7;
const LOST_STAGE_ID = 8;
const DECLINED_STAGE_ID = 9;

interface IndustryRow {
  industry: string;
  count: number;
  won: number;
  lost: number;
  noBid: number;
  open: number;
  wonValue: number;
  lostValue: number;
}

const EXPORT_COLUMNS: ExportColumn[] = [
  { header: "Sr. No.", align: "center", excelWidth: 9, pdfWeight: 0.7 },
  { header: "Industry", align: "left", excelWidth: 32, pdfWeight: 2.8 },
  { header: "Opportunity Count", align: "right", excelWidth: 19, pdfWeight: 1.5 },
  { header: "Won", align: "right", excelWidth: 10, pdfWeight: 0.8 },
  { header: "Lost", align: "right", excelWidth: 10, pdfWeight: 0.8 },
  { header: "No Bid", align: "right", excelWidth: 10, pdfWeight: 0.9 },
  { header: "Open", align: "right", excelWidth: 10, pdfWeight: 0.8 },
  { header: "Won Value", align: "right", excelWidth: 16, pdfWeight: 1.4, currency: true },
  { header: "Lost Value", align: "right", excelWidth: 16, pdfWeight: 1.4, currency: true },
];

export function OpportunityIndustryReport() {
  useSetPageTitle("Opportunity by Industry Report");
  const { hasMenuAccess } = useAuth();
  const { data, loading, error } = useQuery<{ opportunities: IndustryOpportunity[]; userList: ReportUser[] }>(
    INDUSTRY_REPORT_QUERY,
    { fetchPolicy: "cache-and-network" }
  );

  const [applied, setApplied] = useState<ReportFilterValues>(DEFAULT_REPORT_FILTERS);
  const [search, setSearch] = useState("");

  const opportunities = useMemo(
    () => (data?.opportunities ?? []).filter((opportunity) => opportunity.isActive !== false),
    [data]
  );
  const owners = useMemo(() => reportOwnerOptions(opportunities, data?.userList ?? []), [opportunities, data]);
  const period = useMemo(() => resolveReportRange(applied), [applied]);

  const allRows = useMemo<IndustryRow[]>(() => {
    const byIndustry = new Map<string, IndustryRow>();
    for (const opportunity of opportunities) {
      if (applied.ownerIds.length > 0 && (opportunity.ownerId == null || !applied.ownerIds.includes(opportunity.ownerId))) continue;
      if (!isWithinReportRange(opportunity.createdDt, period)) continue;
      const industry = opportunity.sector?.trim() || "Unspecified";
      const row = byIndustry.get(industry) ?? { industry, count: 0, won: 0, lost: 0, noBid: 0, open: 0, wonValue: 0, lostValue: 0 };
      row.count += 1;
      const value = opportunity.submittedEstimateUsd ?? 0;
      if (opportunity.stageId === WON_STAGE_ID) {
        row.won += 1;
        row.wonValue += value;
      } else if (opportunity.stageId === LOST_STAGE_ID) {
        row.lost += 1;
        row.lostValue += value;
      } else if (opportunity.stageId === DECLINED_STAGE_ID) {
        row.noBid += 1;
      } else {
        row.open += 1;
      }
      byIndustry.set(industry, row);
    }
    // Largest industries first, like the dashboard card.
    return [...byIndustry.values()].sort((a, b) => b.count - a.count || a.industry.localeCompare(b.industry));
  }, [opportunities, applied, period]);

  // Live search narrows the grid, its totals and the downloads together.
  const rows = useMemo(() => filterReportRows(allRows, search, row => row.industry), [allRows, search]);

  const totals = rows.reduce(
    (sum, row) => ({
      count: sum.count + row.count,
      won: sum.won + row.won,
      lost: sum.lost + row.lost,
      noBid: sum.noBid + row.noBid,
      open: sum.open + row.open,
      wonValue: sum.wonValue + row.wonValue,
      lostValue: sum.lostValue + row.lostValue,
    }),
    { count: 0, won: 0, lost: 0, noBid: 0, open: 0, wonValue: 0, lostValue: 0 }
  );

  // Downloads export exactly what the grid shows for the applied filters.
  const buildExport = (): ExportTable => ({
    title: "Opportunity by Industry Report",
    subtitle: reportFilterSummary(applied, owners, period),
    columns: EXPORT_COLUMNS,
    rows: rows.map((row, index) => [index + 1, row.industry, row.count, row.won, row.lost, row.noBid, row.open, row.wonValue, row.lostValue]),
    totalRow: ["", "Total", totals.count, totals.won, totals.lost, totals.noBid, totals.open, totals.wonValue, totals.lostValue],
    fileName: `Opportunity_by_Industry_Report_${isoReportDate(period.start)}_to_${isoReportDate(period.end)}`,
  });

  if (!hasMenuAccess(OPPORTUNITY_INDUSTRY_REPORT_MENU_KEY)) {
    return (
      <div className="p-6 lg:p-8">
        <div className={`card-surface p-6 text-sm text-muted-foreground ${REPORT_CARD_SHADOW}`}>
          You don't have access to the Opportunity by Industry Report.
        </div>
      </div>
    );
  }

  const numberCell = "text-right tabular-nums";
  const totalCell = "text-right font-semibold tabular-nums";

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <ReportFiltersCard idPrefix="oir" owners={owners} onApply={setApplied} />

      <div className={`card-surface overflow-hidden ${REPORT_CARD_SHADOW}`}>
        <ReportCardHeader
          icon={Building2}
          title="Industry-wise Opportunities"
          period={period}
          onExcel={() => downloadExcel(buildExport())}
          onPdf={() => downloadPdf(buildExport())}
          exportDisabled={rows.length === 0}
          search={{ value: search, onChange: setSearch, placeholder: "Search industry" }}
        />

        {error ? (
          <p className="p-6 text-sm text-muted-foreground">
            Couldn't load the report data{error.message ? `: ${error.message}` : "."}
          </p>
        ) : loading && !data ? (
          <div className="space-y-2 p-6">
            {[0, 1, 2, 3].map((index) => <Skeleton key={index} className="h-9 w-full" />)}
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-10 text-center text-sm text-muted-foreground">
            <Building2 className="size-6" />
            No opportunities found for the selected filters.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-center">Sr. No.</TableHead>
                <TableHead className="pl-6">Industry</TableHead>
                <TableHead className="text-right">Opportunity Count</TableHead>
                <TableHead className="text-right">Won</TableHead>
                <TableHead className="text-right">Lost</TableHead>
                <TableHead className="text-right">No Bid</TableHead>
                <TableHead className="text-right">Open</TableHead>
                <TableHead className="text-right">Won Value</TableHead>
                <TableHead className="pr-6 text-right">Lost Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, index) => (
                <TableRow key={row.industry}>
                  <TableCell className="text-center tabular-nums">{index + 1}</TableCell>
                  <TableCell className="pl-6 font-medium">{row.industry}</TableCell>
                  <TableCell className={numberCell}>{row.count}</TableCell>
                  <TableCell className={numberCell}>{row.won}</TableCell>
                  <TableCell className={numberCell}>{row.lost}</TableCell>
                  <TableCell className={numberCell}>{row.noBid}</TableCell>
                  <TableCell className={numberCell}>{row.open}</TableCell>
                  <TableCell className={numberCell}>{formatMoney(row.wonValue)}</TableCell>
                  <TableCell className={`pr-6 ${numberCell}`}>{formatMoney(row.lostValue)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell />
                <TableCell className="pl-6 font-semibold">Total</TableCell>
                <TableCell className={totalCell}>{totals.count}</TableCell>
                <TableCell className={totalCell}>{totals.won}</TableCell>
                <TableCell className={totalCell}>{totals.lost}</TableCell>
                <TableCell className={totalCell}>{totals.noBid}</TableCell>
                <TableCell className={totalCell}>{totals.open}</TableCell>
                <TableCell className={totalCell}>{formatMoney(totals.wonValue)}</TableCell>
                <TableCell className={`pr-6 ${totalCell}`}>{formatMoney(totals.lostValue)}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        )}
      </div>
    </div>
  );
}
