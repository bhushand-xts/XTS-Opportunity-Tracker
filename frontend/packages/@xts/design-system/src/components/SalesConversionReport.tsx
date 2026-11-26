import { useMemo, useState } from "react";
import { gql, useQuery } from "@apollo/client";
import { CalendarRange, ChevronDown, FileSpreadsheet, FileText, Filter, Table2, Users } from "lucide-react";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Skeleton } from "./ui/skeleton";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "./ui/table";
import { useAuth } from "@/lib/auth";
import { useSetPageTitle } from "@/lib/pageTitle";
import { downloadExcel, downloadPdf, type ExportColumn, type ExportTable } from "@/lib/reportExport";

// Reports > Sales Conversion Report (mst_menus.menu_key below). Owner-wise
// counts of opportunities created in the selected range, and each owner's
// conversion: Won ÷ (Won + Lost) × 100. Open opportunities are left out of
// the conversion.
export const SALES_CONVERSION_REPORT_MENU_KEY = "sales_conversion_report";

const SALES_CONVERSION_QUERY = gql`
  query SalesConversionReportData($queue: String = "PIPELINE") {
    opportunities(queue: $queue) {
      opportunityId
      stageId
      ownerId
      createdDt
      isActive
    }
    userList { id firstName lastName }
  }
`;

interface ConversionOpportunity {
  opportunityId: number;
  stageId: number | null;
  ownerId: number | null;
  createdDt: string;
  isActive: boolean;
}
interface ConversionUser { id: number; firstName: string | null; lastName: string | null }

// Same stage ids as the dashboard (mst_stage): 7 Won, 8 Lost, 9 No-Bid /
// Declined. Open = anything not closed in one of those three.
const WON_STAGE_ID = 7;
const LOST_STAGE_ID = 8;
const DECLINED_STAGE_ID = 9;

type RangeKey = "this_year" | "this_quarter" | "last_quarter" | "custom";

interface AppliedFilters {
  range: RangeKey;
  startDate: string;
  endDate: string;
  /** Empty means All Owners. */
  ownerIds: number[];
}

// "This Year" is the financial year (Apr–Mar), the same period the dashboard
// uses. Quarters line up with it: Apr–Jun, Jul–Sep, Oct–Dec, Jan–Mar.
function financialYearStart(reference: Date) {
  const year = reference.getMonth() >= 3 ? reference.getFullYear() : reference.getFullYear() - 1;
  return new Date(year, 3, 1);
}

function quarterStart(reference: Date) {
  return new Date(reference.getFullYear(), Math.floor(reference.getMonth() / 3) * 3, 1);
}

function endOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function parseDateInput(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDate(date: Date) {
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function resolveRange(filters: AppliedFilters, today = new Date()): { start: Date; end: Date } {
  switch (filters.range) {
    case "this_year": {
      const start = financialYearStart(today);
      return { start, end: endOfDay(new Date(start.getFullYear() + 1, 2, 31)) };
    }
    case "this_quarter": {
      const start = quarterStart(today);
      return { start, end: endOfDay(new Date(start.getFullYear(), start.getMonth() + 3, 0)) };
    }
    case "last_quarter": {
      const thisStart = quarterStart(today);
      const start = new Date(thisStart.getFullYear(), thisStart.getMonth() - 3, 1);
      return { start, end: endOfDay(new Date(thisStart.getFullYear(), thisStart.getMonth(), 0)) };
    }
    case "custom":
      return { start: parseDateInput(filters.startDate), end: endOfDay(parseDateInput(filters.endDate)) };
  }
}

function userName(user: ConversionUser | undefined, ownerId: number) {
  const name = `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim();
  return name || `User #${ownerId}`;
}

function conversionPercent(won: number, lost: number): number | null {
  return won + lost ? (won / (won + lost)) * 100 : null;
}

function formatPercent(value: number | null) {
  if (value === null) return "—";
  return `${Number(value.toFixed(1))}%`;
}

interface OwnerRow {
  ownerId: number;
  owner: string;
  total: number;
  open: number;
  won: number;
  lost: number;
  declined: number;
}

const RANGE_OPTIONS: Array<{ value: RangeKey; label: string }> = [
  { value: "this_year", label: "This Year" },
  { value: "this_quarter", label: "This Quarter" },
  { value: "last_quarter", label: "Last Quarter" },
  { value: "custom", label: "Custom Range" },
];

const EXPORT_COLUMNS: ExportColumn[] = [
  { header: "Sr. No.", align: "center", excelWidth: 9, pdfWeight: 0.7 },
  { header: "Owner", align: "left", excelWidth: 30, pdfWeight: 3 },
  { header: "Total Opportunities", align: "right", excelWidth: 20, pdfWeight: 1.6 },
  { header: "Open", align: "right", excelWidth: 11, pdfWeight: 1 },
  { header: "Won", align: "right", excelWidth: 11, pdfWeight: 1 },
  { header: "Lost", align: "right", excelWidth: 11, pdfWeight: 1 },
  { header: "No-Bid / Declined", align: "right", excelWidth: 18, pdfWeight: 1.5 },
  { header: "Conversion %", align: "right", excelWidth: 16, pdfWeight: 1.4, percent: true },
];

const EXPORT_BUTTON_CLASS =
  "h-8 gap-1.5 border-primary/30 bg-white px-3 text-xs font-semibold text-primary shadow-none hover:bg-primary hover:text-primary-foreground disabled:opacity-50";

const CARD_SHADOW = "shadow-[0_1px_2px_rgba(16,24,40,0.06),0_4px_16px_-2px_rgba(16,24,40,0.10)]";
// Light header: a soft tint of the brand blue, with blue text and icons.
const CARD_HEADER_STYLE = {
  background: "linear-gradient(90deg, hsl(var(--primary) / 0.12), hsl(var(--primary) / 0.04))",
  borderBottom: "1px solid hsl(var(--primary) / 0.15)",
};

function OwnerMultiSelect({
  owners,
  selected,
  onChange,
}: {
  owners: Array<{ id: number; name: string }>;
  selected: number[];
  onChange: (ids: number[]) => void;
}) {
  const allSelected = selected.length === 0;
  const label = allSelected
    ? "All Owners"
    : selected.length === 1
      ? owners.find((owner) => owner.id === selected[0])?.name ?? "1 owner"
      : `${selected.length} owners selected`;

  const toggle = (id: number) => {
    const next = selected.includes(id) ? selected.filter((value) => value !== id) : [...selected, id];
    // Ticking every owner one by one is the same as All Owners.
    onChange(next.length === owners.length ? [] : next);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="h-9 w-full justify-between font-normal" aria-label="Owner">
          <span className="truncate">{label}</span>
          <ChevronDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[--radix-popover-trigger-width] min-w-56 p-1">
        <div className="max-h-72 overflow-y-auto">
          <label className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm font-medium hover:bg-accent">
            <Checkbox checked={allSelected} onCheckedChange={() => onChange([])} />
            All Owners
          </label>
          <div className="my-1 h-px bg-border" />
          {owners.length === 0 && <p className="px-2 py-1.5 text-sm text-muted-foreground">No owners found.</p>}
          {owners.map((owner) => (
            <label key={owner.id} className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent">
              <Checkbox checked={!allSelected && selected.includes(owner.id)} onCheckedChange={() => toggle(owner.id)} />
              <span className="truncate">{owner.name}</span>
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function SalesConversionReport() {
  useSetPageTitle("Sales Conversion Report");
  const { hasMenuAccess } = useAuth();
  const { data, loading, error } = useQuery<{ opportunities: ConversionOpportunity[]; userList: ConversionUser[] }>(
    SALES_CONVERSION_QUERY,
    { fetchPolicy: "cache-and-network" }
  );

  const [draft, setDraft] = useState<AppliedFilters>({ range: "this_year", startDate: "", endDate: "", ownerIds: [] });
  const [applied, setApplied] = useState<AppliedFilters>(draft);

  const opportunities = useMemo(
    () => (data?.opportunities ?? []).filter((opportunity) => opportunity.isActive !== false),
    [data]
  );

  // The Owner list: everyone who owns at least one opportunity.
  const owners = useMemo(() => {
    const users = data?.userList ?? [];
    const ids = new Set<number>();
    for (const opportunity of opportunities) if (opportunity.ownerId != null) ids.add(opportunity.ownerId);
    return [...ids]
      .map((id) => ({ id, name: userName(users.find((user) => user.id === id), id) }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [opportunities, data]);

  const customInvalid =
    draft.range === "custom" &&
    (!draft.startDate || !draft.endDate || draft.startDate > draft.endDate);
  const customError =
    draft.range === "custom" && draft.startDate && draft.endDate && draft.startDate > draft.endDate
      ? "Start Date cannot be later than End Date."
      : null;

  const period = resolveRange(applied);

  const rows = useMemo<OwnerRow[]>(() => {
    const users = data?.userList ?? [];
    const byOwner = new Map<number, OwnerRow>();
    for (const opportunity of opportunities) {
      if (opportunity.ownerId == null) continue;
      if (applied.ownerIds.length > 0 && !applied.ownerIds.includes(opportunity.ownerId)) continue;
      const created = new Date(opportunity.createdDt).getTime();
      if (Number.isNaN(created) || created < period.start.getTime() || created > period.end.getTime()) continue;

      const row = byOwner.get(opportunity.ownerId) ?? {
        ownerId: opportunity.ownerId,
        owner: userName(users.find((user) => user.id === opportunity.ownerId), opportunity.ownerId),
        total: 0,
        open: 0,
        won: 0,
        lost: 0,
        declined: 0,
      };
      row.total += 1;
      if (opportunity.stageId === WON_STAGE_ID) row.won += 1;
      else if (opportunity.stageId === LOST_STAGE_ID) row.lost += 1;
      else if (opportunity.stageId === DECLINED_STAGE_ID) row.declined += 1;
      else row.open += 1;
      byOwner.set(opportunity.ownerId, row);
    }
    return [...byOwner.values()].sort((a, b) => a.owner.localeCompare(b.owner));
    // period is derived from `applied`, so `applied` covers it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opportunities, data, applied]);

  const totals = rows.reduce(
    (sum, row) => ({
      total: sum.total + row.total,
      open: sum.open + row.open,
      won: sum.won + row.won,
      lost: sum.lost + row.lost,
      declined: sum.declined + row.declined,
    }),
    { total: 0, open: 0, won: 0, lost: 0, declined: 0 }
  );

  // Downloads export exactly what the grid shows for the applied filters.
  const buildExport = (): ExportTable => {
    const ownerLabel =
      applied.ownerIds.length === 0
        ? "All Owners"
        : applied.ownerIds.map((id) => owners.find((owner) => owner.id === id)?.name ?? `User #${id}`).join(", ");
    const rangeLabel = RANGE_OPTIONS.find((option) => option.value === applied.range)?.label ?? "";
    const isoDate = (date: Date) =>
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const ratio = (won: number, lost: number) => (won + lost ? won / (won + lost) : null);
    return {
      title: "Sales Conversion Report",
      subtitle: [
        `Range: ${rangeLabel} (${formatDate(period.start)} – ${formatDate(period.end)})`,
        `Owner: ${ownerLabel}`,
      ],
      columns: EXPORT_COLUMNS,
      rows: rows.map((row, index) => [index + 1, row.owner, row.total, row.open, row.won, row.lost, row.declined, ratio(row.won, row.lost)]),
      totalRow: ["", "Total", totals.total, totals.open, totals.won, totals.lost, totals.declined, ratio(totals.won, totals.lost)],
      fileName: `Sales_Conversion_Report_${isoDate(period.start)}_to_${isoDate(period.end)}`,
    };
  };

  if (!hasMenuAccess(SALES_CONVERSION_REPORT_MENU_KEY)) {
    return (
      <div className="p-6 lg:p-8">
        <div className={`card-surface p-6 text-sm text-muted-foreground ${CARD_SHADOW}`}>
          You don't have access to the Sales Conversion Report.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 lg:p-8">
      {/* Filters */}
      <div className={`card-surface overflow-hidden ${CARD_SHADOW}`}>
        <div className="flex items-center gap-2 px-6 py-3.5" style={CARD_HEADER_STYLE}>
          <Filter className="size-5 shrink-0 text-primary" strokeWidth={2.5} fill="currentColor" fillOpacity={0.2} />
          <h2 className="text-[15px] font-semibold tracking-tight text-foreground">Filters</h2>
        </div>
        <form
          className="flex flex-wrap items-end gap-4 p-6"
          onSubmit={(event) => {
            event.preventDefault();
            if (!customInvalid) setApplied(draft);
          }}
        >
          <div className="grid w-full gap-1.5 sm:w-48">
            <Label htmlFor="scr-range">Range</Label>
            <Select value={draft.range} onValueChange={(value) => setDraft({ ...draft, range: value as RangeKey })}>
              <SelectTrigger id="scr-range" className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RANGE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {draft.range === "custom" && (
            <>
              <div className="grid w-full gap-1.5 sm:w-44">
                <Label htmlFor="scr-start">Start Date</Label>
                <Input
                  id="scr-start"
                  type="date"
                  className="h-9"
                  value={draft.startDate}
                  max={draft.endDate || undefined}
                  onChange={(event) => setDraft({ ...draft, startDate: event.target.value })}
                />
              </div>
              <div className="grid w-full gap-1.5 sm:w-44">
                <Label htmlFor="scr-end">End Date</Label>
                <Input
                  id="scr-end"
                  type="date"
                  className="h-9"
                  value={draft.endDate}
                  min={draft.startDate || undefined}
                  onChange={(event) => setDraft({ ...draft, endDate: event.target.value })}
                />
              </div>
            </>
          )}

          <div className="grid w-full gap-1.5 sm:w-64">
            <Label>Owner</Label>
            <OwnerMultiSelect owners={owners} selected={draft.ownerIds} onChange={(ownerIds) => setDraft({ ...draft, ownerIds })} />
          </div>

          <Button type="submit" className="h-9 px-6" disabled={customInvalid}>
            Apply
          </Button>

          {customError && <p className="w-full text-sm text-destructive">{customError}</p>}
        </form>
      </div>

      {/* Report grid */}
      <div className={`card-surface overflow-hidden ${CARD_SHADOW}`}>
        <div className="flex flex-wrap items-center gap-2 px-6 py-3.5" style={CARD_HEADER_STYLE}>
          <Table2 className="size-5 shrink-0 text-primary" strokeWidth={2.5} fill="currentColor" fillOpacity={0.2} />
          <h2 className="flex-1 text-[15px] font-semibold tracking-tight text-foreground">Owner-wise Sales Conversion</h2>
          <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <CalendarRange className="size-3.5" />
            {formatDate(period.start)} – {formatDate(period.end)}
          </span>
          <div className="ml-2 flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={EXPORT_BUTTON_CLASS}
              disabled={rows.length === 0}
              onClick={() => downloadExcel(buildExport())}
              title="Download as Excel"
            >
              <FileSpreadsheet className="size-4" />
              Excel
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={EXPORT_BUTTON_CLASS}
              disabled={rows.length === 0}
              onClick={() => downloadPdf(buildExport())}
              title="Download as PDF"
            >
              <FileText className="size-4" />
              PDF
            </Button>
          </div>
        </div>

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
            <Users className="size-6" />
            No opportunities found for the selected filters.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-16 pl-6">Sr. No.</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead className="text-center">Total Opportunities</TableHead>
                <TableHead className="text-center">Open</TableHead>
                <TableHead className="text-center">Won</TableHead>
                <TableHead className="text-center">Lost</TableHead>
                <TableHead className="text-center">No-Bid / Declined</TableHead>
                <TableHead className="pr-6 text-center">Conversion %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, index) => (
                <TableRow key={row.ownerId}>
                  <TableCell className="pl-6 text-muted-foreground">{index + 1}</TableCell>
                  <TableCell className="font-medium">{row.owner}</TableCell>
                  <TableCell className="text-center tabular-nums">{row.total}</TableCell>
                  <TableCell className="text-center tabular-nums">{row.open}</TableCell>
                  <TableCell className="text-center tabular-nums">{row.won}</TableCell>
                  <TableCell className="text-center tabular-nums">{row.lost}</TableCell>
                  <TableCell className="text-center tabular-nums">{row.declined}</TableCell>
                  <TableCell
                    className="pr-6 text-center font-semibold tabular-nums"
                    title={row.won + row.lost ? undefined : "No won or lost opportunities yet"}
                  >
                    {formatPercent(conversionPercent(row.won, row.lost))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell className="pl-6" />
                <TableCell className="font-semibold">Total</TableCell>
                <TableCell className="text-center font-semibold tabular-nums">{totals.total}</TableCell>
                <TableCell className="text-center font-semibold tabular-nums">{totals.open}</TableCell>
                <TableCell className="text-center font-semibold tabular-nums">{totals.won}</TableCell>
                <TableCell className="text-center font-semibold tabular-nums">{totals.lost}</TableCell>
                <TableCell className="text-center font-semibold tabular-nums">{totals.declined}</TableCell>
                <TableCell className="pr-6 text-center font-semibold tabular-nums">
                  {formatPercent(conversionPercent(totals.won, totals.lost))}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        )}
      </div>
    </div>
  );
}
