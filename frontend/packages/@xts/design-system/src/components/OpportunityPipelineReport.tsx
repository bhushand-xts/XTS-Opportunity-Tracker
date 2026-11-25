import { Fragment, useMemo, useState } from "react";
import { gql, useQuery } from "@apollo/client";
import { Layers } from "lucide-react";
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

// Reports > Opportunity Pipeline Report (mst_menus.menu_key below). Opportunities
// created in the selected range, grouped by their current stage and
// sub-stage, with the count and total estimated value of each group. The
// value is the estimation team's submitted, CEO-approved estimate
// (submittedEstimateUsd), the same figure the dashboard uses.
export const OPPORTUNITY_PIPELINE_REPORT_MENU_KEY = "opportunity_pipeline_report";
export const OPPORTUNITY_PIPELINE_REPORT_PATH = "/reports/opportunity-pipeline";

const PIPELINE_REPORT_QUERY = gql`
  query OpportunityPipelineReportData($queue: String = "PIPELINE") {
    opportunities(queue: $queue) {
      opportunityId
      stageId
      stageName
      subStageId
      subStageName
      ownerId
      submittedEstimateUsd
      createdDt
      isActive
    }
    userList { id firstName lastName }
    stagesList { id stageName displayOrder isActive }
  }
`;

interface PipelineOpportunity {
  opportunityId: number;
  stageId: number | null;
  stageName: string | null;
  subStageId: number | null;
  subStageName: string | null;
  ownerId: number | null;
  submittedEstimateUsd: number | null;
  createdDt: string;
  isActive: boolean;
}
interface PipelineStage { id: number; stageName: string; displayOrder: number | null; isActive: boolean }

interface PipelineRow {
  key: string;
  stageId: number | null;
  stage: string;
  subStage: string;
  value: number;
  count: number;
  order: number;
  subOrder: number;
}

interface StageGroup {
  stageKey: string;
  stage: string;
  rows: PipelineRow[];
}

const EXPORT_COLUMNS: ExportColumn[] = [
  { header: "Sr. No.", align: "center", excelWidth: 9, pdfWeight: 0.7 },
  { header: "Stage", align: "left", excelWidth: 26, pdfWeight: 2.4 },
  { header: "Substage", align: "left", excelWidth: 34, pdfWeight: 3 },
  { header: "Estimated Value", align: "right", excelWidth: 20, pdfWeight: 1.6, currency: true },
  { header: "Count", align: "right", excelWidth: 11, pdfWeight: 1 },
];

export function OpportunityPipelineReport() {
  useSetPageTitle("Opportunity Pipeline Report");
  const { hasMenuAccess } = useAuth();
  const { data, loading, error } = useQuery<{
    opportunities: PipelineOpportunity[];
    userList: ReportUser[];
    stagesList: PipelineStage[];
  }>(PIPELINE_REPORT_QUERY, { fetchPolicy: "cache-and-network" });

  const [applied, setApplied] = useState<ReportFilterValues>(DEFAULT_REPORT_FILTERS);

  const opportunities = useMemo(
    () => (data?.opportunities ?? []).filter((opportunity) => opportunity.isActive !== false),
    [data]
  );
  const owners = useMemo(() => reportOwnerOptions(opportunities, data?.userList ?? []), [opportunities, data]);
  const period = useMemo(() => resolveReportRange(applied), [applied]);

  const rows = useMemo<PipelineRow[]>(() => {
    // Stages in the stage master's pipeline order; sub-stages by id.
    const stageOrder = new Map<number, number>();
    for (const stage of data?.stagesList ?? []) stageOrder.set(stage.id, stage.displayOrder ?? stage.id);

    const buckets = new Map<string, PipelineRow>();
    for (const opportunity of opportunities) {
      if (applied.ownerIds.length > 0 && (opportunity.ownerId == null || !applied.ownerIds.includes(opportunity.ownerId))) continue;
      if (!isWithinReportRange(opportunity.createdDt, period)) continue;
      const key = `${opportunity.stageId ?? "none"}-${opportunity.subStageId ?? "none"}`;
      const row = buckets.get(key) ?? {
        key,
        stageId: opportunity.stageId,
        stage: opportunity.stageName ?? "Unknown",
        subStage: opportunity.subStageName ?? "—",
        value: 0,
        count: 0,
        order: opportunity.stageId == null ? Number.MAX_SAFE_INTEGER : stageOrder.get(opportunity.stageId) ?? opportunity.stageId,
        subOrder: opportunity.subStageId ?? Number.MAX_SAFE_INTEGER,
      };
      row.value += opportunity.submittedEstimateUsd ?? 0;
      row.count += 1;
      buckets.set(key, row);
    }
    return [...buckets.values()].sort((a, b) => a.order - b.order || a.subOrder - b.subOrder);
  }, [opportunities, data, applied, period]);

  // Rows grouped by stage so the Stage cell spans its sub-stages in the grid.
  const groups = useMemo<StageGroup[]>(() => {
    const result: StageGroup[] = [];
    for (const row of rows) {
      const stageKey = String(row.stageId ?? "none");
      const last = result[result.length - 1];
      if (last && last.stageKey === stageKey) last.rows.push(row);
      else result.push({ stageKey, stage: row.stage, rows: [row] });
    }
    return result;
  }, [rows]);

  const totals = rows.reduce((sum, row) => ({ value: sum.value + row.value, count: sum.count + row.count }), { value: 0, count: 0 });

  // Downloads export exactly what the grid shows for the applied filters.
  const buildExport = (): ExportTable => ({
    title: "Opportunity Pipeline Report",
    subtitle: reportFilterSummary(applied, owners, period),
    columns: EXPORT_COLUMNS,
    // Sr. No. and Stage appear on the first row of each stage only, as in the grid.
    rows: groups.flatMap((group, groupIndex) =>
      group.rows.map((row, index) => [index === 0 ? groupIndex + 1 : "", index === 0 ? group.stage : "", row.subStage, row.value, row.count])
    ),
    totalRow: ["", "Total", "", totals.value, totals.count],
    fileName: `Opportunity_Pipeline_Report_${isoReportDate(period.start)}_to_${isoReportDate(period.end)}`,
  });

  if (!hasMenuAccess(OPPORTUNITY_PIPELINE_REPORT_MENU_KEY)) {
    return (
      <div className="p-6 lg:p-8">
        <div className={`card-surface p-6 text-sm text-muted-foreground ${REPORT_CARD_SHADOW}`}>
          You don't have access to the Opportunity Pipeline Report.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <ReportFiltersCard idPrefix="opr" owners={owners} onApply={setApplied} />

      <div className={`card-surface overflow-hidden ${REPORT_CARD_SHADOW}`}>
        <ReportCardHeader
          icon={Layers}
          title="Stage-wise Opportunity Pipeline"
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
            <Layers className="size-6" />
            No opportunities found for the selected filters.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-16 pl-6">Sr. No.</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Substage</TableHead>
                <TableHead className="text-right">Estimated Value</TableHead>
                <TableHead className="pr-6 text-right">Count</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.map((group, groupIndex) => (
                <Fragment key={group.stageKey}>
                  {group.rows.map((row, index) => {
                    return (
                      <TableRow key={row.key}>
                        {/* Sr. No. counts stages, so it spans the stage's sub-stage rows like the Stage cell. */}
                        {index === 0 && (
                          <TableCell rowSpan={group.rows.length} className="pl-6 align-top text-muted-foreground">
                            {groupIndex + 1}
                          </TableCell>
                        )}
                        {index === 0 && (
                          <TableCell rowSpan={group.rows.length} className="border-r align-top font-semibold text-primary">
                            {group.stage}
                          </TableCell>
                        )}
                        <TableCell>{row.subStage}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatMoney(row.value)}</TableCell>
                        <TableCell className="pr-6 text-right font-semibold tabular-nums">{row.count}</TableCell>
                      </TableRow>
                    );
                  })}
                </Fragment>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell className="pl-6" />
                <TableCell className="font-semibold">Total</TableCell>
                <TableCell />
                <TableCell className="text-right font-semibold tabular-nums">{formatMoney(totals.value)}</TableCell>
                <TableCell className="pr-6 text-right font-semibold tabular-nums">{totals.count}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        )}
      </div>
    </div>
  );
}
