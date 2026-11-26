import { useMemo, useState } from "react";
import { gql, useQuery } from "@apollo/client";
import { Scale } from "lucide-react";
import { Skeleton } from "./ui/skeleton";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "./ui/table";
import {
  DEFAULT_REPORT_FILTERS,
  REPORT_CARD_SHADOW,
  ReportCardHeader,
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

// Reports > Win/Loss Analysis Report (mst_menus.menu_key below). Every Won or
// Lost opportunity created in the selected range, with its client, value,
// result, and the comment recorded when it was closed. Value is the final
// estimate — the estimation team's submitted, selected estimate
// (submittedEstimateUsd) — the same figure the dashboard uses. Comment is
// tbl_opportunity_engage_tracker.comment from the closing step (the latest
// stage-history entry), exposed as workflowComment.
export const WIN_LOSS_REPORT_MENU_KEY = "win_loss_analysis_report";
export const WIN_LOSS_REPORT_PATH = "/reports/win-loss-analysis";

const WIN_LOSS_QUERY = gql`
  query WinLossAnalysisReportData($queue: String = "PIPELINE") {
    opportunities(queue: $queue) {
      opportunityId
      opportunityName
      stageId
      clientName
      ownerId
      submittedEstimateUsd
      workflowComment
      createdDt
      updatedDt
      isActive
    }
    userList { id firstName lastName }
  }
`;

interface WinLossOpportunity {
  opportunityId: number;
  opportunityName: string | null;
  stageId: number | null;
  clientName: string | null;
  ownerId: number | null;
  submittedEstimateUsd: number | null;
  workflowComment: string | null;
  createdDt: string;
  updatedDt: string | null;
  isActive: boolean;
}

// Same stage ids as the dashboard (mst_stage): 7 Won, 8 Lost.
const WON_STAGE_ID = 7;
const LOST_STAGE_ID = 8;

interface WinLossRow {
  opportunityId: number;
  opportunity: string;
  client: string;
  value: number;
  result: "Won" | "Lost";
  comment: string | null;
  closedAt: number;
}

const EXPORT_COLUMNS: ExportColumn[] = [
  { header: "Sr. No.", align: "center", excelWidth: 9, pdfWeight: 0.7 },
  { header: "Opportunity", align: "left", excelWidth: 30, pdfWeight: 2.2 },
  { header: "Client", align: "left", excelWidth: 26, pdfWeight: 2 },
  { header: "Value", align: "right", excelWidth: 16, pdfWeight: 1.2, currency: true },
  { header: "Result", align: "center", excelWidth: 10, pdfWeight: 0.8 },
  { header: "Comment", align: "left", excelWidth: 50, pdfWeight: 3.6 },
];

const RESULT_BADGE = {
  Won: "bg-[hsl(var(--stage-5)/0.14)] text-[hsl(var(--stage-5))]",
  Lost: "bg-destructive/10 text-destructive",
} as const;

export function WinLossAnalysisReport() {
  useSetPageTitle("Win/Loss Analysis Report");
  const { hasMenuAccess } = useAuth();
  const { data, loading, error } = useQuery<{ opportunities: WinLossOpportunity[]; userList: ReportUser[] }>(
    WIN_LOSS_QUERY,
    { fetchPolicy: "cache-and-network" }
  );

  const [applied, setApplied] = useState<ReportFilterValues>(DEFAULT_REPORT_FILTERS);

  const opportunities = useMemo(
    () => (data?.opportunities ?? []).filter((opportunity) => opportunity.isActive !== false),
    [data]
  );
  const owners = useMemo(() => reportOwnerOptions(opportunities, data?.userList ?? []), [opportunities, data]);
  const period = useMemo(() => resolveReportRange(applied), [applied]);

  const rows = useMemo<WinLossRow[]>(() => {
    return opportunities
      .filter(
        (opportunity) =>
          (opportunity.stageId === WON_STAGE_ID || opportunity.stageId === LOST_STAGE_ID) &&
          (applied.ownerIds.length === 0 || (opportunity.ownerId != null && applied.ownerIds.includes(opportunity.ownerId))) &&
          isWithinReportRange(opportunity.createdDt, period)
      )
      .map((opportunity) => ({
        opportunityId: opportunity.opportunityId,
        opportunity: opportunity.opportunityName ?? `Opportunity #${opportunity.opportunityId}`,
        client: opportunity.clientName ?? "—",
        value: opportunity.submittedEstimateUsd ?? 0,
        result: opportunity.stageId === WON_STAGE_ID ? ("Won" as const) : ("Lost" as const),
        comment: opportunity.workflowComment?.trim() || null,
        closedAt: new Date(opportunity.updatedDt ?? opportunity.createdDt).getTime() || 0,
      }))
      // Most recently closed first.
      .sort((a, b) => b.closedAt - a.closedAt || a.opportunity.localeCompare(b.opportunity));
  }, [opportunities, applied, period]);

  const totals = rows.reduce(
    (sum, row) => ({
      won: sum.won + (row.result === "Won" ? 1 : 0),
      lost: sum.lost + (row.result === "Lost" ? 1 : 0),
      wonValue: sum.wonValue + (row.result === "Won" ? row.value : 0),
      lostValue: sum.lostValue + (row.result === "Lost" ? row.value : 0),
    }),
    { won: 0, lost: 0, wonValue: 0, lostValue: 0 }
  );
  const totalLabel = `${totals.won} Won (${formatMoney(totals.wonValue)}) · ${totals.lost} Lost (${formatMoney(totals.lostValue)})`;

  // Downloads export exactly what the grid shows for the applied filters.
  const buildExport = (): ExportTable => ({
    title: "Win/Loss Analysis Report",
    subtitle: reportFilterSummary(applied, owners, period),
    columns: EXPORT_COLUMNS,
    rows: rows.map((row, index) => [index + 1, row.opportunity, row.client, row.value, row.result, row.comment]),
    totalRow: ["", "Total", "", totals.wonValue + totals.lostValue, "", totalLabel],
    fileName: `Win_Loss_Analysis_Report_${isoReportDate(period.start)}_to_${isoReportDate(period.end)}`,
  });

  if (!hasMenuAccess(WIN_LOSS_REPORT_MENU_KEY)) {
    return (
      <div className="p-6 lg:p-8">
        <div className={`card-surface p-6 text-sm text-muted-foreground ${REPORT_CARD_SHADOW}`}>
          You don't have access to the Win/Loss Analysis Report.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <ReportFiltersCard idPrefix="wla" owners={owners} onApply={setApplied} />

      <div className={`card-surface overflow-hidden ${REPORT_CARD_SHADOW}`}>
        <ReportCardHeader
          icon={Scale}
          title="Win / Loss Analysis"
          period={period}
          onExcel={() => downloadExcel(buildExport())}
          onPdf={() => downloadPdf(buildExport())}
          exportDisabled={rows.length === 0}
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
            <Scale className="size-6" />
            No won or lost opportunities found for the selected filters.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-center">Sr. No.</TableHead>
                <TableHead className="pl-6">Opportunity</TableHead>
                <TableHead>Client</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead className="pl-6">Result</TableHead>
                <TableHead className="pr-6">Comment</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, index) => (
                <TableRow key={row.opportunityId}>
                  <TableCell className="text-center tabular-nums">{index + 1}</TableCell>
                  <TableCell className="pl-6 font-medium">{row.opportunity}</TableCell>
                  <TableCell>{row.client}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatMoney(row.value)}</TableCell>
                  <TableCell className="pl-6">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${RESULT_BADGE[row.result]}`}>
                      {row.result}
                    </span>
                  </TableCell>
                  <TableCell className="pr-6">
                    {row.comment ?? <span className="text-muted-foreground">—</span>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell />
                <TableCell className="pl-6 font-semibold">Total</TableCell>
                <TableCell />
                <TableCell className="text-right font-semibold tabular-nums">{formatMoney(totals.wonValue + totals.lostValue)}</TableCell>
                <TableCell className="pl-6 pr-6 font-semibold" colSpan={2}>
                  {totalLabel}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        )}
      </div>
    </div>
  );
}
