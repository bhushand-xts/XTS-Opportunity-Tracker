import { useMemo, useState } from "react";
import { gql, useQuery } from "@apollo/client";
import { Building2 } from "lucide-react";
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
  type ReportClientOption,
  type ReportFilterValues,
  type ReportUser,
} from "./ReportFilters";
import { useAuth } from "@/lib/auth";
import { useSetPageTitle } from "@/lib/pageTitle";
import { formatMoney } from "@/lib/store";
import { downloadExcel, downloadPdf, type ExportColumn, type ExportTable } from "@/lib/reportExport";

// Reports > Opportunity by Client Report (mst_menus.menu_key below).
// Opportunities created in the selected range, grouped by client: total,
// Open / Won / Lost / No Bid, and the Won and Lost value. Values are the final
// estimate — the estimation team's submitted, selected estimate
// (submittedEstimateUsd) — the same figure the dashboard uses.
export const OPPORTUNITY_CLIENT_REPORT_MENU_KEY = "opportunity_client_report";
export const OPPORTUNITY_CLIENT_REPORT_PATH = "/reports/opportunity-client";

const CLIENT_REPORT_QUERY = gql`
  query OpportunityClientReportData($queue: String = "PIPELINE") {
    opportunities(queue: $queue) {
      opportunityId
      stageId
      clientId
      clientName
      ownerId
      submittedEstimateUsd
      createdDt
      isActive
    }
    userList { id firstName lastName }
  }
`;

// Separate query so the report still works if the client master can't load;
// the Client filter then falls back to the clients found on opportunities.
const CLIENT_OPTIONS_QUERY = gql`
  query ReportClientOptions {
    clientsList { id clientName isActive }
  }
`;

interface ClientOpportunity {
  opportunityId: number;
  stageId: number | null;
  clientId: number | null;
  clientName: string | null;
  ownerId: number | null;
  submittedEstimateUsd: number | null;
  createdDt: string;
  isActive: boolean;
}
interface ClientMaster { id: number; clientName: string; isActive: boolean }

// Same stage ids as the dashboard (mst_stage): 7 Won, 8 Lost, 9 No-Bid /
// Declined. Open = anything not closed in one of those three.
const WON_STAGE_ID = 7;
const LOST_STAGE_ID = 8;
const DECLINED_STAGE_ID = 9;

interface ClientRow {
  clientId: number;
  client: string;
  total: number;
  open: number;
  won: number;
  lost: number;
  noBid: number;
  wonValue: number;
  lostValue: number;
}

const EXPORT_COLUMNS: ExportColumn[] = [
  { header: "Client", align: "left", excelWidth: 30, pdfWeight: 2.6 },
  { header: "Total Opportunities", align: "right", excelWidth: 20, pdfWeight: 1.6 },
  { header: "Open", align: "right", excelWidth: 10, pdfWeight: 0.8 },
  { header: "Won", align: "right", excelWidth: 10, pdfWeight: 0.8 },
  { header: "Lost", align: "right", excelWidth: 10, pdfWeight: 0.8 },
  { header: "No Bid", align: "right", excelWidth: 10, pdfWeight: 0.9 },
  { header: "Won Value", align: "right", excelWidth: 16, pdfWeight: 1.4, currency: true },
  { header: "Lost Value", align: "right", excelWidth: 16, pdfWeight: 1.4, currency: true },
];

export function OpportunityClientReport() {
  useSetPageTitle("Opportunity by Client Report");
  const { hasMenuAccess } = useAuth();
  const { data, loading, error } = useQuery<{ opportunities: ClientOpportunity[]; userList: ReportUser[] }>(
    CLIENT_REPORT_QUERY,
    { fetchPolicy: "cache-and-network" }
  );
  const { data: clientData } = useQuery<{ clientsList: ClientMaster[] | null }>(CLIENT_OPTIONS_QUERY, {
    fetchPolicy: "cache-and-network",
  });

  const [applied, setApplied] = useState<ReportFilterValues>(DEFAULT_REPORT_FILTERS);

  const opportunities = useMemo(
    () => (data?.opportunities ?? []).filter((opportunity) => opportunity.isActive !== false),
    [data]
  );
  const owners = useMemo(() => reportOwnerOptions(opportunities, data?.userList ?? []), [opportunities, data]);
  const period = useMemo(() => resolveReportRange(applied), [applied]);

  // Client filter: every active client in the client master, plus any client
  // that appears on an opportunity (so nothing reportable is missing).
  const clients = useMemo<ReportClientOption[]>(() => {
    const byId = new Map<number, string>();
    for (const client of clientData?.clientsList ?? []) if (client.isActive !== false) byId.set(client.id, client.clientName);
    for (const opportunity of opportunities) {
      if (opportunity.clientId != null && !byId.has(opportunity.clientId)) {
        byId.set(opportunity.clientId, opportunity.clientName ?? `Client #${opportunity.clientId}`);
      }
    }
    return [...byId].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [clientData, opportunities]);

  const rows = useMemo<ClientRow[]>(() => {
    const byClient = new Map<number, ClientRow>();
    for (const opportunity of opportunities) {
      if (opportunity.clientId == null) continue;
      if (applied.ownerIds.length > 0 && (opportunity.ownerId == null || !applied.ownerIds.includes(opportunity.ownerId))) continue;
      if (applied.clientIds.length > 0 && !applied.clientIds.includes(opportunity.clientId)) continue;
      if (!isWithinReportRange(opportunity.createdDt, period)) continue;
      const row = byClient.get(opportunity.clientId) ?? {
        clientId: opportunity.clientId,
        client: opportunity.clientName ?? `Client #${opportunity.clientId}`,
        total: 0,
        open: 0,
        won: 0,
        lost: 0,
        noBid: 0,
        wonValue: 0,
        lostValue: 0,
      };
      row.total += 1;
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
      byClient.set(opportunity.clientId, row);
    }
    // Top clients by won value first, like the dashboard card.
    return [...byClient.values()].sort((a, b) => b.wonValue - a.wonValue || a.client.localeCompare(b.client));
  }, [opportunities, applied, period]);

  const totals = rows.reduce(
    (sum, row) => ({
      total: sum.total + row.total,
      open: sum.open + row.open,
      won: sum.won + row.won,
      lost: sum.lost + row.lost,
      noBid: sum.noBid + row.noBid,
      wonValue: sum.wonValue + row.wonValue,
      lostValue: sum.lostValue + row.lostValue,
    }),
    { total: 0, open: 0, won: 0, lost: 0, noBid: 0, wonValue: 0, lostValue: 0 }
  );

  // Downloads export exactly what the grid shows for the applied filters.
  const buildExport = (): ExportTable => ({
    title: "Opportunity by Client Report",
    subtitle: reportFilterSummary(applied, owners, period, clients),
    columns: EXPORT_COLUMNS,
    rows: rows.map((row) => [row.client, row.total, row.open, row.won, row.lost, row.noBid, row.wonValue, row.lostValue]),
    totalRow: ["Total", totals.total, totals.open, totals.won, totals.lost, totals.noBid, totals.wonValue, totals.lostValue],
    fileName: `Opportunity_by_Client_Report_${isoReportDate(period.start)}_to_${isoReportDate(period.end)}`,
  });

  if (!hasMenuAccess(OPPORTUNITY_CLIENT_REPORT_MENU_KEY)) {
    return (
      <div className="p-6 lg:p-8">
        <div className={`card-surface p-6 text-sm text-muted-foreground ${REPORT_CARD_SHADOW}`}>
          You don't have access to the Opportunity by Client Report.
        </div>
      </div>
    );
  }

  const numberCell = "text-right tabular-nums";
  const totalCell = "text-right font-semibold tabular-nums";

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <ReportFiltersCard idPrefix="ocr" owners={owners} clients={clients} onApply={setApplied} />

      <div className={`card-surface overflow-hidden ${REPORT_CARD_SHADOW}`}>
        <ReportCardHeader
          icon={Building2}
          title="Client-wise Opportunities"
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
            <Building2 className="size-6" />
            No opportunities found for the selected filters.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="pl-6">Client</TableHead>
                <TableHead className="text-right">Total Opportunities</TableHead>
                <TableHead className="text-right">Open</TableHead>
                <TableHead className="text-right">Won</TableHead>
                <TableHead className="text-right">Lost</TableHead>
                <TableHead className="text-right">No Bid</TableHead>
                <TableHead className="text-right">Won Value</TableHead>
                <TableHead className="pr-6 text-right">Lost Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.clientId}>
                  <TableCell className="pl-6 font-medium">{row.client}</TableCell>
                  <TableCell className={numberCell}>{row.total}</TableCell>
                  <TableCell className={numberCell}>{row.open}</TableCell>
                  <TableCell className={numberCell}>{row.won}</TableCell>
                  <TableCell className={numberCell}>{row.lost}</TableCell>
                  <TableCell className={numberCell}>{row.noBid}</TableCell>
                  <TableCell className={numberCell}>{formatMoney(row.wonValue)}</TableCell>
                  <TableCell className={`pr-6 ${numberCell}`}>{formatMoney(row.lostValue)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell className="pl-6 font-semibold">Total</TableCell>
                <TableCell className={totalCell}>{totals.total}</TableCell>
                <TableCell className={totalCell}>{totals.open}</TableCell>
                <TableCell className={totalCell}>{totals.won}</TableCell>
                <TableCell className={totalCell}>{totals.lost}</TableCell>
                <TableCell className={totalCell}>{totals.noBid}</TableCell>
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
