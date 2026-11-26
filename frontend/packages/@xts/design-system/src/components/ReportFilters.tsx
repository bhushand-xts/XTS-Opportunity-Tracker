import { useState } from "react";
import { CalendarRange, ChevronDown, FileSpreadsheet, FileText, Filter, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

// Shared pieces for the Reports screens: the Range / Owner / Apply filter
// card, the date-range maths, and the light card header with Excel / PDF
// buttons.

export type ReportRangeKey = "this_year" | "this_quarter" | "last_quarter" | "custom";

export interface ReportFilterValues {
  range: ReportRangeKey;
  startDate: string;
  endDate: string;
  /** Empty means All Owners. */
  ownerIds: number[];
  /** Empty means All Clients. Only used by reports that show the Client filter. */
  clientIds: number[];
}

export interface ReportOwnerOption { id: number; name: string }
export type ReportClientOption = ReportOwnerOption;
export interface ReportUser { id: number; firstName: string | null; lastName: string | null }

export const REPORT_RANGE_OPTIONS: Array<{ value: ReportRangeKey; label: string }> = [
  { value: "this_year", label: "This Year" },
  { value: "this_quarter", label: "This Quarter" },
  { value: "last_quarter", label: "Last Quarter" },
  { value: "custom", label: "Custom Range" },
];

export const DEFAULT_REPORT_FILTERS: ReportFilterValues = { range: "this_year", startDate: "", endDate: "", ownerIds: [], clientIds: [] };

export const REPORT_CARD_SHADOW = "shadow-[0_1px_2px_rgba(16,24,40,0.06),0_4px_16px_-2px_rgba(16,24,40,0.10)]";
// Light header: a soft tint of the brand blue, with blue text and icons.
const REPORT_CARD_HEADER_STYLE = {
  background: "linear-gradient(90deg, hsl(var(--primary) / 0.12), hsl(var(--primary) / 0.04))",
  borderBottom: "1px solid hsl(var(--primary) / 0.15)",
};
const EXPORT_BUTTON_CLASS =
  "h-8 gap-1.5 border-primary/30 bg-white px-3 text-xs font-semibold text-primary shadow-none hover:bg-primary hover:text-primary-foreground disabled:opacity-50";

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

export function formatReportDate(date: Date) {
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function isoReportDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function resolveReportRange(filters: ReportFilterValues, today = new Date()): { start: Date; end: Date } {
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

export function isWithinReportRange(dateString: string, period: { start: Date; end: Date }) {
  const time = new Date(dateString).getTime();
  return !Number.isNaN(time) && time >= period.start.getTime() && time <= period.end.getTime();
}

export function reportUserName(users: ReportUser[], id: number) {
  const user = users.find((candidate) => candidate.id === id);
  const name = `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim();
  return name || `User #${id}`;
}

/** Everyone who owns at least one of these opportunities, by name. */
export function reportOwnerOptions(opportunities: Array<{ ownerId: number | null }>, users: ReportUser[]): ReportOwnerOption[] {
  const ids = new Set<number>();
  for (const opportunity of opportunities) if (opportunity.ownerId != null) ids.add(opportunity.ownerId);
  return [...ids].map((id) => ({ id, name: reportUserName(users, id) })).sort((a, b) => a.name.localeCompare(b.name));
}

/** "Range: …", "Owner: …" (and "Client: …" when given) lines for the top of an Excel / PDF download. */
export function reportFilterSummary(
  filters: ReportFilterValues,
  owners: ReportOwnerOption[],
  period: { start: Date; end: Date },
  clients?: ReportClientOption[]
) {
  const listLabel = (ids: number[], options: ReportOwnerOption[], all: string, fallback: string) =>
    ids.length === 0 ? all : ids.map((id) => options.find((option) => option.id === id)?.name ?? `${fallback} #${id}`).join(", ");
  const rangeLabel = REPORT_RANGE_OPTIONS.find((option) => option.value === filters.range)?.label ?? "";
  const lines = [
    `Range: ${rangeLabel} (${formatReportDate(period.start)} – ${formatReportDate(period.end)})`,
    `Owner: ${listLabel(filters.ownerIds, owners, "All Owners", "User")}`,
  ];
  if (clients) lines.push(`Client: ${listLabel(filters.clientIds, clients, "All Clients", "Client")}`);
  return lines;
}

function MultiSelectFilter({
  options,
  selected,
  onChange,
  allLabel,
  noun,
}: {
  options: ReportOwnerOption[];
  selected: number[];
  onChange: (ids: number[]) => void;
  /** e.g. "All Owners". */
  allLabel: string;
  /** Plural, lower case, e.g. "owners". */
  noun: string;
}) {
  const allSelected = selected.length === 0;
  const label = allSelected
    ? allLabel
    : selected.length === 1
      ? options.find((option) => option.id === selected[0])?.name ?? `1 ${noun}`
      : `${selected.length} ${noun} selected`;

  const toggle = (id: number) => {
    const next = selected.includes(id) ? selected.filter((value) => value !== id) : [...selected, id];
    // Ticking every option one by one is the same as All.
    onChange(next.length === options.length ? [] : next);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="h-9 w-full justify-between font-normal" aria-label={allLabel}>
          <span className="truncate">{label}</span>
          <ChevronDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[--radix-popover-trigger-width] min-w-56 p-1">
        <div className="max-h-72 overflow-y-auto">
          <label className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm font-medium hover:bg-accent">
            <Checkbox checked={allSelected} onCheckedChange={() => onChange([])} />
            {allLabel}
          </label>
          <div className="my-1 h-px bg-border" />
          {options.length === 0 && <p className="px-2 py-1.5 text-sm text-muted-foreground">No {noun} found.</p>}
          {options.map((owner) => (
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

/** The Filters card. Holds its own draft; `onApply` fires on Apply. */
export function ReportFiltersCard({
  idPrefix,
  owners,
  clients,
  showOwner = true,
  onApply,
}: {
  idPrefix: string;
  owners: ReportOwnerOption[];
  /** Hide Owner for reports whose only filter is the date range. */
  showOwner?: boolean;
  /** When given, a Client multi-select is shown after Owner. */
  clients?: ReportClientOption[];
  onApply: (filters: ReportFilterValues) => void;
}) {
  const [draft, setDraft] = useState<ReportFilterValues>(DEFAULT_REPORT_FILTERS);
  const customInvalid = draft.range === "custom" && (!draft.startDate || !draft.endDate || draft.startDate > draft.endDate);
  const customError =
    draft.range === "custom" && draft.startDate && draft.endDate && draft.startDate > draft.endDate
      ? "Start Date cannot be later than End Date."
      : null;

  return (
    <div className={`card-surface overflow-hidden ${REPORT_CARD_SHADOW}`}>
      <ReportCardHeader icon={Filter} title="Filters" />
      <form
        className="flex flex-wrap items-end gap-4 p-6"
        onSubmit={(event) => {
          event.preventDefault();
          if (!customInvalid) onApply(draft);
        }}
      >
        <div className="grid w-full gap-1.5 sm:w-48">
          <Label htmlFor={`${idPrefix}-range`}>Range</Label>
          <Select value={draft.range} onValueChange={(value) => setDraft({ ...draft, range: value as ReportRangeKey })}>
            <SelectTrigger id={`${idPrefix}-range`} className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REPORT_RANGE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {draft.range === "custom" && (
          <>
            <div className="grid w-full gap-1.5 sm:w-44">
              <Label htmlFor={`${idPrefix}-start`}>Start Date</Label>
              <Input
                id={`${idPrefix}-start`}
                type="date"
                className="h-9"
                value={draft.startDate}
                max={draft.endDate || undefined}
                onChange={(event) => setDraft({ ...draft, startDate: event.target.value })}
              />
            </div>
            <div className="grid w-full gap-1.5 sm:w-44">
              <Label htmlFor={`${idPrefix}-end`}>End Date</Label>
              <Input
                id={`${idPrefix}-end`}
                type="date"
                className="h-9"
                value={draft.endDate}
                min={draft.startDate || undefined}
                onChange={(event) => setDraft({ ...draft, endDate: event.target.value })}
              />
            </div>
          </>
        )}

        {showOwner && <div className="grid w-full gap-1.5 sm:w-64">
          <Label>Owner</Label>
          <MultiSelectFilter
            options={owners}
            selected={draft.ownerIds}
            onChange={(ownerIds) => setDraft({ ...draft, ownerIds })}
            allLabel="All Owners"
            noun="owners"
          />
        </div>}

        {clients && (
          <div className="grid w-full gap-1.5 sm:w-64">
            <Label>Client</Label>
            <MultiSelectFilter
              options={clients}
              selected={draft.clientIds}
              onChange={(clientIds) => setDraft({ ...draft, clientIds })}
              allLabel="All Clients"
              noun="clients"
            />
          </div>
        )}

        <Button type="submit" className="h-9 px-6" disabled={customInvalid}>
          Apply
        </Button>

        {customError && <p className="w-full text-sm text-destructive">{customError}</p>}
      </form>
    </div>
  );
}

/** Light card header: icon + title, and optionally the period and Excel / PDF buttons. */
export function ReportCardHeader({
  icon: Icon,
  title,
  period,
  onExcel,
  onPdf,
  exportDisabled,
}: {
  icon: LucideIcon;
  title: ReactNode;
  period?: { start: Date; end: Date };
  onExcel?: () => void;
  onPdf?: () => void;
  exportDisabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 px-6 py-3.5" style={REPORT_CARD_HEADER_STYLE}>
      <Icon className="size-5 shrink-0 text-primary" strokeWidth={2.5} fill="currentColor" fillOpacity={0.2} />
      <h2 className="flex-1 text-[15px] font-semibold tracking-tight text-foreground">{title}</h2>
      {period && (
        <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <CalendarRange className="size-3.5" />
          {formatReportDate(period.start)} – {formatReportDate(period.end)}
        </span>
      )}
      {(onExcel || onPdf) && (
        <div className="ml-2 flex items-center gap-2">
          {onExcel && (
            <Button type="button" variant="outline" size="sm" className={EXPORT_BUTTON_CLASS} disabled={exportDisabled} onClick={onExcel} title="Download as Excel">
              <FileSpreadsheet className="size-4" />
              Excel
            </Button>
          )}
          {onPdf && (
            <Button type="button" variant="outline" size="sm" className={EXPORT_BUTTON_CLASS} disabled={exportDisabled} onClick={onPdf} title="Download as PDF">
              <FileText className="size-4" />
              PDF
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
