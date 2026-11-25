import { useMemo, useState, type KeyboardEvent, type ReactNode } from "react";
import { gql, useQuery } from "@apollo/client";
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";
import {
  type LucideIcon,
  Activity,
  ArrowRight,
  Ban,
  BarChart3,
  Building2,
  Clock,
  Handshake,
  Layers,
  Target,
  TrendingUp,
  Trophy,
  User,
  Users,
  XCircle,
} from "lucide-react";
import { DonutChart, type DonutChartDatum } from "./ui/donut-chart";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "./ui/chart";
import { Progress } from "./ui/progress";
import { ScrollArea } from "./ui/scroll-area";
import { Skeleton } from "./ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useSetPageTitle } from "@/lib/pageTitle";
import { formatMoney } from "@/lib/store";
import { OPPORTUNITY_PIPELINE_REPORT_MENU_KEY, OPPORTUNITY_PIPELINE_REPORT_PATH } from "./OpportunityPipelineReport";
import { OPPORTUNITY_INDUSTRY_REPORT_MENU_KEY, OPPORTUNITY_INDUSTRY_REPORT_PATH } from "./OpportunityIndustryReport";
import { OPPORTUNITY_OWNER_REPORT_MENU_KEY, OPPORTUNITY_OWNER_REPORT_PATH } from "./OpportunityOwnerReport";
import { OPPORTUNITY_CLIENT_REPORT_MENU_KEY, OPPORTUNITY_CLIENT_REPORT_PATH } from "./OpportunityClientReport";
import { WIN_LOSS_REPORT_MENU_KEY, WIN_LOSS_REPORT_PATH } from "./WinLossAnalysisReport";

// stageHistory is a per-opportunity field resolver (see
// opportunity.resolver.ts), so it works on the bulk `opportunities` query
// too, not just the single-opportunity one.
// submittedEstimateUsd is the estimation team's selected, submitted estimate
// (the CEO-approved value once the opportunity is past estimate review). Every
// money figure on this page uses it, never the entered estimatedValueUsd.
const REPORTS_QUERY = gql`
  query ReportsData($queue: String = "PIPELINE") {
    opportunities(queue: $queue) {
      opportunityId
      opportunityName
      stageId
      stageName
      subStageId
      subStageName
      clientId
      clientName
      sector
      ownerId
      submittedEstimateUsd
      createdDt
      updatedDt
      isActive
      stageHistory { stageId subStageId reachedAt }
    }
    userList { id firstName lastName }
    stagesList { id stageName displayOrder isActive }
  }
`;

interface ReportStageHistoryEntry { stageId: number; subStageId: number; reachedAt: string }
interface ReportStage { id: number; stageName: string; displayOrder: number | null; isActive: boolean }
interface ReportOpportunity {
  opportunityId: number;
  opportunityName: string | null;
  stageId: number | null;
  stageName: string | null;
  subStageId: number | null;
  subStageName: string | null;
  clientId: number | null;
  clientName: string | null;
  sector: string | null;
  ownerId: number | null;
  submittedEstimateUsd: number | null;
  createdDt: string;
  updatedDt: string | null;
  isActive: boolean;
  stageHistory: ReportStageHistoryEntry[];
}
interface ReportUser { id: number; firstName: string | null; lastName: string | null }

// Confirmed against mst_stage: 7 = Closed — Won, 8 = Closed — Lost,
// 9 = No-Bid / Declined. The three gates below (stage + sub-stage pairs)
// are where projectAllowedActions() in opportunity.service.ts exposes an
// approve/reject/request-changes action, i.e. where something is actually
// waiting on a decision.
const WON_STAGE_ID = 7;
const LOST_STAGE_ID = 8;
const DECLINED_STAGE_ID = 9;
const APPROVAL_GATES: Array<{ stageId: number; subStageIds: number[] }> = [
  { stageId: 1, subStageIds: [1, 3] },
  { stageId: 2, subStageIds: [4, 5, 6] },
  { stageId: 4, subStageIds: [5, 8, 9] },
];

const PALETTE = [
  "hsl(var(--stage-1))",
  "hsl(var(--stage-2))",
  "hsl(var(--stage-3))",
  "hsl(var(--stage-4))",
  "hsl(var(--stage-5))",
  "hsl(var(--primary))",
  "hsl(var(--destructive))",
  "hsl(var(--muted-foreground))",
];

function sum(values: Array<number | null | undefined>) {
  return values.reduce<number>((total, value) => total + (value ?? 0), 0);
}

// Reuses the existing --stage-N / --destructive theme tokens (already
// correct in both light and dark mode) as icon/badge accents, instead of
// introducing a second, hardcoded color system.
const ACCENT = {
  blue: { icon: "hsl(var(--stage-1))", bg: "hsl(var(--stage-1) / 0.14)" },
  purple: { icon: "hsl(var(--stage-2))", bg: "hsl(var(--stage-2) / 0.14)" },
  pink: { icon: "hsl(var(--stage-3))", bg: "hsl(var(--stage-3) / 0.14)" },
  orange: { icon: "hsl(var(--stage-4))", bg: "hsl(var(--stage-4) / 0.14)" },
  green: { icon: "hsl(var(--stage-5))", bg: "hsl(var(--stage-5) / 0.14)" },
  red: { icon: "hsl(var(--destructive))", bg: "hsl(var(--destructive) / 0.14)" },
  gray: { icon: "hsl(var(--muted-foreground))", bg: "hsl(var(--muted-foreground) / 0.14)" },
} as const;

// One decimal keeps any K / M / B amount short enough to sit inside a donut
// (e.g. $569.4K, $1.3M, $2.1B).
const compactMoneyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});
function formatCompactMoney(value: number) {
  return compactMoneyFormatter.format(value);
}

const FY_MONTH_LABELS = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];

// India's financial year: Apr 1 – Mar 31. Indexing off the FY's start month
// (not the calendar month) keeps "month 0" = April everywhere below.
function currentFinancialYear(reference = new Date()) {
  const startYear = reference.getMonth() >= 3 ? reference.getFullYear() : reference.getFullYear() - 1;
  const start = new Date(startYear, 3, 1, 0, 0, 0, 0);
  const end = new Date(startYear + 1, 2, 31, 23, 59, 59, 999);
  const label = `FY ${startYear}-${String((startYear + 1) % 100).padStart(2, "0")}`;
  return { startYear, start, end, label };
}

function isWithinFinancialYear(dateString: string, fy: ReturnType<typeof currentFinancialYear>) {
  const timestamp = new Date(dateString).getTime();
  return !Number.isNaN(timestamp) && timestamp >= fy.start.getTime() && timestamp <= fy.end.getTime();
}

// Conversion = Won ÷ (Won + Lost): only closed deals count.
function conversion(won: number, lost: number) {
  return won + lost ? (won / (won + lost)) * 100 : 0;
}

function isAtApprovalGate(opportunity: ReportOpportunity) {
  return APPROVAL_GATES.some(
    (gate) => gate.stageId === opportunity.stageId && gate.subStageIds.includes(opportunity.subStageId ?? -1)
  );
}

function daysSince(dateString: string | null) {
  if (!dateString) return 0;
  const timestamp = new Date(dateString).getTime();
  if (Number.isNaN(timestamp)) return 0;
  return Math.max(0, Math.floor((Date.now() - timestamp) / 86_400_000));
}

function ownerName(users: ReportUser[], ownerId: number | null) {
  if (ownerId == null) return "Unassigned";
  const user = users.find((candidate) => candidate.id === ownerId);
  if (!user) return `User #${ownerId}`;
  const name = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
  return name || `User #${ownerId}`;
}

// Chronological order. The last entry here is the opportunity's current
// row in tbl_opportunity_engage_tracker (is_current = TRUE) — the schema
// enforces exactly one current row per opportunity, and it's always the
// most recently reached one, so sorting by reachedAt and taking the tail
// gets it without the GraphQL layer needing to expose is_current itself.
function sortedHistory(opportunity: ReportOpportunity) {
  return [...(opportunity.stageHistory ?? [])].sort(
    (a, b) => new Date(a.reachedAt).getTime() - new Date(b.reachedAt).getTime()
  );
}

interface BreakdownItem { key: string; stage: string | null; subStage: string | null; count: number }

function estimate(opportunity: ReportOpportunity) {
  return opportunity.submittedEstimateUsd ?? 0;
}

function buildReportMetrics(opportunities: ReportOpportunity[], users: ReportUser[], stages: ReportStage[]) {
  const fy = currentFinancialYear();
  const active = opportunities.filter(
    (opportunity) => opportunity.isActive !== false && isWithinFinancialYear(opportunity.createdDt, fy)
  );
  const total = active.length;
  const won = active.filter((opportunity) => opportunity.stageId === WON_STAGE_ID);
  const lost = active.filter((opportunity) => opportunity.stageId === LOST_STAGE_ID);
  const conversionPct = conversion(won.length, lost.length);
  const pending = active.filter(isAtApprovalGate);

  // In-process: everything still genuinely in motion — not yet closed Won,
  // Lost, or declined. Broken down by the exact stage+sub-stage combination.
  // No-Bid/Declined gets its own tile instead of living in here.
  const inProcessBuckets = new Map<string, BreakdownItem & { order: number }>();
  const declinedBuckets = new Map<string, BreakdownItem & { order: number }>();
  for (const opportunity of active) {
    if (opportunity.stageId === WON_STAGE_ID || opportunity.stageId === LOST_STAGE_ID) continue;
    const key = `${opportunity.stageId}-${opportunity.subStageId}`;
    const isDeclined = opportunity.stageId === DECLINED_STAGE_ID;
    const bucketMap = isDeclined ? declinedBuckets : inProcessBuckets;
    const bucket = bucketMap.get(key) ?? {
      key,
      // Every row in the declined breakdown is already "No-Bid/Declined" by
      // definition, so that one shows the sub-stage alone.
      stage: isDeclined ? null : opportunity.stageName ?? "Unknown",
      subStage: opportunity.subStageName ?? (isDeclined ? opportunity.stageName ?? "Unknown" : null),
      count: 0,
      order: (opportunity.stageId ?? 0) * 100 + (opportunity.subStageId ?? 0),
    };
    bucket.count += 1;
    bucketMap.set(key, bucket);
  }
  const inProcessBreakdown = [...inProcessBuckets.values()].sort((a, b) => a.order - b.order);
  const inProcessTotal = inProcessBreakdown.reduce((runningTotal, bucket) => runningTotal + bucket.count, 0);
  const declinedBreakdown = [...declinedBuckets.values()].sort((a, b) => a.order - b.order);
  const declinedTotal = declinedBreakdown.reduce((runningTotal, bucket) => runningTotal + bucket.count, 0);

  // Opportunity counts per stage, in the stage master's pipeline order.
  // Won/Lost/Declined get their semantic colors; the open stages cycle
  // through the general palette on their own counter.
  const countByStageId = new Map<number, number>();
  for (const opportunity of active) {
    if (opportunity.stageId == null) continue;
    countByStageId.set(opportunity.stageId, (countByStageId.get(opportunity.stageId) ?? 0) + 1);
  }
  let openStageIndex = 0;
  const byStage: DonutChartDatum[] = [...stages]
    .sort((a, b) => (a.displayOrder ?? a.id) - (b.displayOrder ?? b.id))
    .filter((stage) => (countByStageId.get(stage.id) ?? 0) > 0)
    .map((stage) => {
      let color: string;
      if (stage.id === WON_STAGE_ID) color = "hsl(var(--stage-5))";
      else if (stage.id === LOST_STAGE_ID) color = "hsl(var(--destructive))";
      else if (stage.id === DECLINED_STAGE_ID) color = "hsl(var(--muted-foreground))";
      else color = PALETTE[openStageIndex++ % PALETTE.length];
      return { key: `stage-${stage.id}`, label: stage.stageName, value: countByStageId.get(stage.id) ?? 0, color };
    });

  // Opportunity counts per client industry, largest first.
  const industryCounts = new Map<string, number>();
  for (const opportunity of active) {
    const key = opportunity.sector?.trim() || "Unspecified";
    industryCounts.set(key, (industryCounts.get(key) ?? 0) + 1);
  }
  const byIndustry: DonutChartDatum[] = [...industryCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, count], index) => ({ key: label, label, value: count, color: PALETTE[index % PALETTE.length] }));

  // Won / lost values: the submitted (CEO-approved) estimate.
  const wonValueUsd = sum(won.map(estimate));
  const lostValueUsd = sum(lost.map(estimate));
  // Individual deals behind the Win / loss card's "View details", largest first.
  const toDeal = (opportunity: ReportOpportunity) => ({
    id: opportunity.opportunityId,
    name: opportunity.opportunityName ?? `Opportunity ${opportunity.opportunityId}`,
    client: opportunity.clientName ?? "",
    value: estimate(opportunity),
  });
  const wonDeals = won.map(toDeal).sort((a, b) => b.value - a.value);
  const lostDeals = lost.map(toDeal).sort((a, b) => b.value - a.value);

  // Won opportunities only, valued at their submitted / approved estimate.
  const wonByOwner = new Map<number, number>();
  const wonByClient = new Map<string, number>();
  for (const opportunity of won) {
    const ownerKey = opportunity.ownerId ?? -1;
    wonByOwner.set(ownerKey, (wonByOwner.get(ownerKey) ?? 0) + estimate(opportunity));
    const clientKey = opportunity.clientName?.trim() || "Unknown client";
    wonByClient.set(clientKey, (wonByClient.get(clientKey) ?? 0) + estimate(opportunity));
  }
  const valueByOwner = [...wonByOwner.entries()]
    .map(([ownerId, value]) => ({ name: ownerName(users, ownerId === -1 ? null : ownerId), value }))
    .sort((a, b) => b.value - a.value);
  const topClients = [...wonByClient.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // Same formula as the Conversion tile, per owner with at least one closed deal.
  const closedByOwner = new Map<number, { won: number; lost: number }>();
  for (const opportunity of [...won, ...lost]) {
    const key = opportunity.ownerId ?? -1;
    const bucket = closedByOwner.get(key) ?? { won: 0, lost: 0 };
    if (opportunity.stageId === WON_STAGE_ID) bucket.won += 1;
    else bucket.lost += 1;
    closedByOwner.set(key, bucket);
  }
  const conversionByOwner = [...closedByOwner.entries()]
    .map(([ownerId, bucket]) => ({ name: ownerName(users, ownerId === -1 ? null : ownerId), value: conversion(bucket.won, bucket.lost) }))
    .sort((a, b) => b.value - a.value);

  // FY months from April up to the current month, defaulting to 0 — not
  // just the months that happen to have an opportunity in them.
  const monthCounts = new Array(12).fill(0);
  for (const opportunity of active) {
    const fyMonthIndex = (new Date(opportunity.createdDt).getMonth() + 9) % 12; // 0 = Apr
    monthCounts[fyMonthIndex] += 1;
  }
  const elapsedMonths = ((new Date().getMonth() + 9) % 12) + 1;
  // Labelled with the two-digit year, e.g. "Nov 26" — Apr–Dec fall in the
  // FY's start year, Jan–Mar in the next one.
  const createdPerMonth = FY_MONTH_LABELS.slice(0, elapsedMonths).map((month, index) => ({
    month: `${month} ${String((index < 9 ? fy.startYear : fy.startYear + 1) % 100).padStart(2, "0")}`,
    count: monthCounts[index],
  }));

  const pendingWithWait = pending
    .map((opportunity) => {
      const history = sortedHistory(opportunity);
      // reachedAt of the current (is_current) row = when it landed at this
      // gate — a more accurate "waiting since" than updatedDt, which also
      // changes for edits that have nothing to do with the stage.
      const reachedCurrentStageAt = history.length ? history[history.length - 1].reachedAt : null;
      return {
        opportunityId: opportunity.opportunityId,
        name: opportunity.opportunityName ?? `Opportunity #${opportunity.opportunityId}`,
        daysWaiting: daysSince(reachedCurrentStageAt ?? opportunity.updatedDt ?? opportunity.createdDt),
      };
    })
    .sort((a, b) => b.daysWaiting - a.daysWaiting);

  return {
    fyLabel: fy.label,
    total, wonCount: won.length, lostCount: lost.length, conversionPct, wonValueUsd, lostValueUsd, wonDeals, lostDeals,
    byStage, byIndustry, valueByOwner, topClients, conversionByOwner, createdPerMonth, pendingWithWait,
    inProcessBreakdown, inProcessTotal, declinedBreakdown, declinedTotal,
  };
}

// A visibly "lifted" card — .card-surface's own shadow-sm is a utility from
// the components layer, so these plain utilities (utilities layer) win
// without needing !important.
const CARD_SHADOW = "shadow-[0_1px_2px_rgba(16,24,40,0.06),0_4px_16px_-2px_rgba(16,24,40,0.10)] hover:shadow-[0_2px_4px_rgba(16,24,40,0.08),0_12px_28px_-4px_rgba(16,24,40,0.16)] transition-shadow duration-300";

// Every report card in the grid is the same fixed height; a list longer
// than fits scrolls inside the card (FILL_SCROLL) instead of stretching it.
// "View details" lifts the fixed height so the whole list shows.
const CARD_HEIGHT = "h-[28rem]";
const FILL_SCROLL = "min-h-0 flex-1 self-stretch";

// Radix ScrollArea wraps content in a `display: table` div that grows to fit
// its widest row, so long labels push values past the card edge instead of
// truncating. Forcing it back to block lets `truncate` do its job.
const SCROLL_NO_OVERFLOW = "[&>[data-radix-scroll-area-viewport]>div]:!block";

type Accent = (typeof ACCENT)[keyof typeof ACCENT];

// Won opportunities are green everywhere (same token as the Closed — Won stage).
const WON_BAR_CLASS = "bg-[hsl(var(--stage-5)/0.2)] [&>div]:bg-[hsl(var(--stage-5))]";

// Shared stat-tile layout: a full-height flex column so every tile in the
// row matches; the header always reserves two lines (labels clamp, never
// push the number down); the count sits centred in the space below it.
const TILE_ROOT = "card-surface animate-in fade-in slide-in-from-bottom-2 flex h-full flex-col p-5 duration-500 fill-mode-both";

function TileHeader({ label, icon: Icon, accent }: { label: string; icon: LucideIcon; accent: Accent }) {
  return (
    <div className="flex h-11 items-center justify-center gap-3">
      {/* Glossy badge: light-to-full gradient of the accent, a soft colored
          glow underneath and a thin inner highlight on top. */}
      <span
        className="flex size-11 shrink-0 items-center justify-center rounded-full"
        style={{
          background: `linear-gradient(145deg, color-mix(in srgb, ${accent.icon} 62%, white), ${accent.icon} 70%)`,
          boxShadow: `0 6px 14px -4px color-mix(in srgb, ${accent.icon} 60%, transparent), inset 0 1px 1.5px rgba(255,255,255,0.55), inset 0 -2px 4px rgba(0,0,0,0.12)`,
        }}
      >
        <Icon className="size-[22px] text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.25)]" strokeWidth={2.25} />
      </span>
      <p className="line-clamp-2 min-w-0 text-left text-xs font-medium uppercase leading-tight tracking-wider text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

function StatTile({
  label,
  value,
  icon: Icon,
  accent,
  subValue,
  subLabel,
  delay = 0,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  accent: Accent;
  /** A secondary figure under the main number, e.g. the dollar value behind a count. */
  subValue?: string;
  subLabel?: string;
  delay?: number;
}) {
  return (
    <div
      className={`${TILE_ROOT} ${CARD_SHADOW}`}
      style={{
        animationDelay: `${delay}ms`,
        background: `linear-gradient(135deg, ${accent.bg}, hsl(var(--card)) 75%)`,
      }}
    >
      <TileHeader label={label} icon={Icon} accent={accent} />
      <div className="flex flex-1 flex-col items-center justify-center pt-3 text-center">
        <p className="text-[28px] font-semibold leading-none tracking-tight tabular-nums">{value}</p>
        {subValue && (
          <div
            className="mt-3 rounded-md border-l-[3px] px-2.5 py-1.5"
            style={{ backgroundColor: accent.bg, borderLeftColor: accent.icon }}
          >
            {subLabel && <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{subLabel}</p>}
            <p className="text-base font-bold leading-tight tabular-nums" style={{ color: accent.icon }}>{subValue}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Breakdown rows: stage in blue, sub-stage as a purple tag, count in the
// tile's own color — three different colors for three different things.
const BREAKDOWN_STAGE_COLOR = "hsl(var(--primary))";

// Same card shell as StatTile, but the number's breakdown shows on hover —
// for counts that break down into stage / sub-stage parts.
function BreakdownStatTile({
  label,
  value,
  icon: Icon,
  accent,
  breakdown,
  delay = 0,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  accent: Accent;
  breakdown: BreakdownItem[];
  delay?: number;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={`${TILE_ROOT} cursor-default ${CARD_SHADOW}`}
          style={{
            animationDelay: `${delay}ms`,
            background: `linear-gradient(135deg, ${accent.bg}, hsl(var(--card)) 75%)`,
          }}
        >
          <TileHeader label={label} icon={Icon} accent={accent} />
          <div className="flex flex-1 flex-col items-center justify-center pt-3 text-center">
            <p className="text-[28px] font-semibold leading-none tracking-tight tabular-nums">{value}</p>
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" align="start" className="w-64 max-w-[calc(100vw-2rem)] border bg-card p-0 text-card-foreground shadow-lg">
        <div className="border-b px-2.5 py-1.5">
          <p className="text-[11px] font-semibold">{label} breakdown</p>
        </div>
        <ul className="max-h-60 divide-y divide-border/60 overflow-y-auto px-2.5">
          {breakdown.map((item) => (
            <li key={item.key} className="flex items-center justify-between gap-2 py-1.5 text-[11px] leading-tight">
              <span className="flex min-w-0 flex-wrap items-center gap-1">
                {item.stage && <span className="break-words font-semibold" style={{ color: BREAKDOWN_STAGE_COLOR }}>{item.stage}</span>}
                {item.subStage && (
                  <span className="rounded-full px-1.5 py-px text-[10px] font-medium" style={{ backgroundColor: ACCENT.purple.bg, color: ACCENT.purple.icon }}>
                    {item.subStage}
                  </span>
                )}
              </span>
              <span className="min-w-5 shrink-0 rounded px-1 py-px text-center text-[10px] font-bold tabular-nums text-white" style={{ backgroundColor: accent.icon }}>
                {item.count}
              </span>
            </li>
          ))}
          {breakdown.length === 0 && <li className="text-xs text-muted-foreground">No data yet.</li>}
        </ul>
      </TooltipContent>
    </Tooltip>
  );
}

// A solid banner strip across the top of every card — same treatment for
// all of them (not accent-varied), matching the reference design.
const CARD_HEADER_STYLE = { background: "linear-gradient(90deg, hsl(224 65% 22%), hsl(221 76% 46%))" };

function ReportCard({
  title,
  icon: Icon,
  children,
  className,
  delay = 0,
  expanded,
  onToggleExpanded,
  onOpen,
  openLabel,
}: {
  title: string;
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
  delay?: number;
  /** When provided, the header shows a "View details" toggle for this card's own list. */
  expanded?: boolean;
  onToggleExpanded?: () => void;
  /** When provided, clicking the card opens its full report. */
  onOpen?: () => void;
  openLabel?: string;
}) {
  return (
    <div
      className={`card-surface animate-in fade-in slide-in-from-bottom-2 flex flex-col overflow-hidden duration-500 fill-mode-both ${CARD_SHADOW} ${onOpen ? "cursor-pointer" : ""} ${className ?? ""}`}
      style={{ animationDelay: `${delay}ms` }}
      {...(onOpen && {
        role: "link",
        tabIndex: 0,
        title: openLabel,
        "aria-label": openLabel,
        onClick: onOpen,
        onKeyDown: (event: KeyboardEvent) => {
          if (event.key === "Enter") onOpen();
        },
      })}
    >
      <div className="flex shrink-0 items-center gap-2 px-6 py-3.5" style={CARD_HEADER_STYLE}>
        {Icon && <Icon className="size-5 shrink-0 text-white" strokeWidth={2.5} fill="currentColor" fillOpacity={0.25} />}
        <h2 className="min-w-0 flex-1 truncate text-[15px] font-semibold tracking-tight text-white" title={title}>{title}</h2>
        {onToggleExpanded && (
          <button
            type="button"
            onClick={(event) => {
              // Don't let "View details" also open the card's report.
              event.stopPropagation();
              onToggleExpanded();
            }}
            className="flex shrink-0 items-center gap-1 text-xs font-medium text-white/90 transition-colors hover:text-white"
          >
            {expanded ? "Show less" : "View details"}
            <ArrowRight className={`size-3 transition-transform ${expanded ? "-rotate-90" : ""}`} />
          </button>
        )}
      </div>
      <div className="flex min-h-0 flex-1 flex-col p-6">{children}</div>
    </div>
  );
}

// Spans two grid columns with the donut beside a small table, so every name
// fits in full.
function DonutReportCard({
  title,
  icon,
  data,
  itemHeading,
  valueHeading = "Value",
  delay = 0,
  onOpen,
  openLabel,
}: {
  title: string;
  icon?: LucideIcon;
  data: DonutChartDatum[];
  /** Column heading for the item names, e.g. "Industry". */
  itemHeading: string;
  valueHeading?: string;
  delay?: number;
  onOpen?: () => void;
  openLabel?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <ReportCard title={title} icon={icon} delay={delay} className={`sm:col-span-2 ${expanded ? "" : CARD_HEIGHT}`} expanded={expanded} onToggleExpanded={() => setExpanded((value) => !value)} onOpen={onOpen} openLabel={openLabel}>
      <div className="flex min-h-0 flex-1 flex-col items-center gap-6 md:flex-row md:items-start">
        <div className="w-[160px] shrink-0">
          <DonutChart data={data} centerLabel="Total" />
        </div>
        <ScrollArea className={`w-full min-w-0 ${SCROLL_NO_OVERFLOW} ${expanded ? "" : FILL_SCROLL}`}>
          {/* pr-4 keeps values clear of the overlay scrollbar. */}
          <div className="pr-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="pb-2 text-left font-medium">{itemHeading}</th>
                  <th className="pb-2 pl-3 text-right font-medium">{valueHeading}</th>
                </tr>
              </thead>
              <tbody>
                {data.map((item) => (
                  <tr key={item.key} className="border-t border-border/60">
                    <td className="py-2 pr-3">
                      <span className="flex items-center gap-2.5">
                        <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} aria-hidden="true" />
                        <span className="break-words">{item.label}</span>
                      </span>
                    </td>
                    <td className="py-2 pl-3 text-right font-medium tabular-nums">{item.value}</td>
                  </tr>
                ))}
                {data.length === 0 && (
                  <tr>
                    <td colSpan={2} className="py-2 text-muted-foreground">No data yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </ScrollArea>
      </div>
    </ReportCard>
  );
}

interface WinLossDeal { id: number; name: string; client: string; value: number }

// Compact single-column card: won vs lost value as a donut, with deal counts,
// amounts and each side's share of the closed value underneath.
function WinLossCard({
  wonCount,
  lostCount,
  wonValue,
  lostValue,
  wonDeals,
  lostDeals,
  delay = 0,
  onOpen,
  openLabel,
}: {
  wonCount: number;
  lostCount: number;
  wonValue: number;
  lostValue: number;
  wonDeals: WinLossDeal[];
  lostDeals: WinLossDeal[];
  delay?: number;
  onOpen?: () => void;
  openLabel?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const closedValue = wonValue + lostValue;
  const rows = [
    { key: "won", label: "Won", count: wonCount, value: wonValue, accent: ACCENT.green, icon: Trophy, deals: wonDeals },
    { key: "lost", label: "Lost", count: lostCount, value: lostValue, accent: ACCENT.red, icon: XCircle, deals: lostDeals },
  ];
  const data: DonutChartDatum[] = rows.map((row) => ({ key: row.key, label: row.label, value: row.value, color: row.accent.icon }));
  return (
    <ReportCard
      title="Win / loss by value"
      icon={Users}
      delay={delay}
      className={expanded ? "" : CARD_HEIGHT}
      expanded={expanded}
      onToggleExpanded={() => setExpanded((value) => !value)}
      onOpen={onOpen}
      openLabel={openLabel}
    >
      <div className="flex min-h-0 flex-1 flex-col items-center gap-4">
        <div className="w-[140px] shrink-0">
          <DonutChart data={data} formatTotal={formatCompactMoney} formatValue={formatMoney} centerLabel="Closed" emptyLabel="No closed deals yet" />
        </div>
        <div className="w-full space-y-2.5">
          {rows.map((row) => {
            const Icon = row.icon;
            const share = closedValue ? (row.value / closedValue) * 100 : 0;
            return (
              <div
                key={row.key}
                className="flex items-center gap-3 rounded-lg border-l-[3px] px-3 py-2"
                style={{ backgroundColor: row.accent.bg, borderLeftColor: row.accent.icon }}
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: row.accent.icon }}>
                  <Icon className="size-3.5 text-white" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    {row.label} · {row.count} {row.count === 1 ? "deal" : "deals"}
                  </p>
                  <p className="text-sm font-bold tabular-nums" style={{ color: row.accent.icon }}>{formatMoney(row.value)}</p>
                </div>
                <span className="shrink-0 text-xs font-semibold tabular-nums" style={{ color: row.accent.icon }}>{share.toFixed(1)}%</span>
              </div>
            );
          })}
        </div>
        {expanded && (
          <div className="w-full space-y-4 border-t pt-4">
            {rows.map((row) => (
              <div key={row.key}>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide" style={{ color: row.accent.icon }}>
                  {row.label} deals
                </p>
                {row.deals.length === 0 ? (
                  <p className="text-xs text-muted-foreground">None this year.</p>
                ) : (
                  <ul className="divide-y divide-border/60">
                    {row.deals.map((deal) => (
                      <li key={deal.id} className="flex items-start justify-between gap-3 py-1.5 text-sm">
                        <span className="min-w-0">
                          <span className="block break-words font-medium">{deal.name}</span>
                          {deal.client && <span className="block break-words text-xs text-muted-foreground">{deal.client}</span>}
                        </span>
                        <span className="shrink-0 font-medium tabular-nums">{formatMoney(deal.value)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </ReportCard>
  );
}

function BarListCard({
  title,
  icon,
  rows,
  valueFormatter,
  barClassName,
  delay = 0,
  onOpen,
  openLabel,
}: {
  title: string;
  icon?: LucideIcon;
  rows: Array<{ name: string; value: number }>;
  valueFormatter: (value: number) => string;
  /** Recolors the bars, e.g. green for won opportunities. */
  barClassName?: string;
  delay?: number;
  onOpen?: () => void;
  openLabel?: string;
}) {
  const max = Math.max(1, ...rows.map((row) => row.value));
  const [expanded, setExpanded] = useState(false);
  return (
    <ReportCard title={title} icon={icon} delay={delay} className={expanded ? "" : CARD_HEIGHT} expanded={expanded} onToggleExpanded={() => setExpanded((value) => !value)} onOpen={onOpen} openLabel={openLabel}>
      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No data yet.</p>
      ) : (
        <ScrollArea className={`${SCROLL_NO_OVERFLOW} ${expanded ? "" : FILL_SCROLL}`}>
          <ul className="space-y-4 pr-3">
            {rows.map((row) => (
              <li key={row.name} className="flex items-center gap-4">
                <span className="w-24 shrink-0 truncate text-sm sm:w-32" title={row.name}>{row.name}</span>
                <Progress value={max ? (row.value / max) * 100 : 0} className={`h-2.5 flex-1 ${barClassName ?? ""}`} />
                <span className="w-20 shrink-0 text-right text-sm font-medium tabular-nums">{valueFormatter(row.value)}</span>
              </li>
            ))}
          </ul>
        </ScrollArea>
      )}
    </ReportCard>
  );
}

function PendingApprovalsCard({
  rows,
  delay = 0,
}: {
  rows: Array<{ opportunityId: number; name: string; daysWaiting: number }>;
  delay?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <ReportCard
      title="Pending approvals (days waiting)"
      icon={Clock}
      delay={delay}
      className={expanded ? "" : CARD_HEIGHT}
      expanded={expanded}
      onToggleExpanded={() => setExpanded((value) => !value)}
    >
      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Nothing waiting right now.</p>
      ) : (
        <ScrollArea className={`${SCROLL_NO_OVERFLOW} ${expanded ? "" : FILL_SCROLL}`}>
          <ul className="space-y-4 pr-3">
            {rows.map((item) => (
              <li key={item.opportunityId} className="flex items-center gap-4">
                <span className="w-24 shrink-0 truncate text-sm sm:w-32" title={item.name}>{item.name}</span>
                <Progress value={Math.min(100, (item.daysWaiting / 7) * 100)} className="h-2.5 flex-1" />
                <span className="w-12 shrink-0 text-right text-sm font-medium tabular-nums">{item.daysWaiting}d</span>
              </li>
            ))}
          </ul>
        </ScrollArea>
      )}
    </ReportCard>
  );
}

function ReportsSkeleton() {
  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-24" />)}
      </div>
      <div className="grid items-start gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-80" />)}
      </div>
    </div>
  );
}

const MONTH_CHART_CONFIG: ChartConfig = { count: { label: "Opportunities created", color: "hsl(var(--primary))" } };

// Every bar gets a bold count above it; the bar with the most opportunities
// gets its count in a soft circle plus a "Peak Month" tag whose arrow points
// at that circle. The tag sits on the side away from the nearer card edge.
function monthBarLabel(peakIndex: number, barCount: number) {
  const side = peakIndex >= barCount / 2 ? -1 : 1;
  return (props: any) => {
    const { x, y, width, value, index } = props;
    const cx = x + width / 2;
    if (index !== peakIndex) {
      return (
        <text
          key={`m-${index}`}
          x={cx}
          y={y - 8}
          textAnchor="middle"
          fontSize={14}
          fontWeight={700}
          fill={value ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground) / 0.6)"}
        >
          {value}
        </text>
      );
    }
    const tagWidth = 104;
    const tagHeight = 28;
    const tagX = side > 0 ? cx + 40 : cx - 40 - tagWidth;
    const tagY = y - 66;
    const arrowFromX = side > 0 ? tagX + 6 : tagX + tagWidth - 6;
    return (
      <g key={`m-${index}`}>
        {/* Solid badge with a white ring, sitting just above the bar. */}
        <circle
          cx={cx}
          cy={y - 20}
          r={16}
          fill="hsl(var(--primary))"
          stroke="#ffffff"
          strokeWidth={3}
          style={{ filter: "drop-shadow(0 4px 8px hsl(var(--primary) / 0.35))" }}
        />
        <text x={cx} y={y - 20} textAnchor="middle" dominantBaseline="central" fontSize={15} fontWeight={800} fill="#ffffff">
          {value}
        </text>
        <path
          d={`M ${arrowFromX} ${tagY + tagHeight} Q ${arrowFromX} ${y - 22} ${cx + side * 22} ${y - 22}`}
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          strokeLinecap="round"
          fill="none"
          markerEnd="url(#peak-month-arrow)"
        />
        <g transform={`translate(${tagX}, ${tagY})`}>
          <rect
            rx={tagHeight / 2}
            width={tagWidth}
            height={tagHeight}
            fill="hsl(var(--primary))"
            style={{ filter: "drop-shadow(0 4px 10px hsl(var(--primary) / 0.4))" }}
          />
          <text x={tagWidth / 2} y={tagHeight / 2} textAnchor="middle" dominantBaseline="central" fontSize={12.5} fontWeight={700} fill="#ffffff">
            Peak Month
          </text>
        </g>
      </g>
    );
  };
}

export function DashboardContent() {
  const { data, loading, error } = useQuery(REPORTS_QUERY, { fetchPolicy: "cache-and-network" });
  const navigate = useNavigate();
  const { hasMenuAccess } = useAuth();

  const metrics = useMemo(
    () => buildReportMetrics(data?.opportunities ?? [], data?.userList ?? [], data?.stagesList ?? []),
    [data]
  );
  // The top-bar title carries the period (fyLabel comes from today's date, so
  // it is correct even before the data loads and rolls over each April).
  useSetPageTitle(`Live summary for ${metrics.fyLabel} (Apr–Mar)`);

  if (loading && !data) return <ReportsSkeleton />;

  if (error) {
    return (
      <div className="p-6 lg:p-8">
        <div className={`card-surface p-6 text-sm text-muted-foreground ${CARD_SHADOW}`}>
          Couldn't load the reports data{error.message ? `: ${error.message}` : "."}
        </div>
      </div>
    );
  }

  const peakMonthIndex = metrics.createdPerMonth.reduce(
    (best, month, index) => (month.count > metrics.createdPerMonth[best].count ? index : best),
    0
  );
  const peakMonthValue = metrics.createdPerMonth[peakMonthIndex]?.count ?? 0;
  // Four even whole-number steps with ~30% headroom above the peak bar for
  // its badge and tag, e.g. a peak of 6 gives 0 · 2 · 4 · 6 · 8.
  const monthAxisStep = Math.max(1, Math.ceil((peakMonthValue * 1.3) / 4));
  const monthAxisTicks = [0, 1, 2, 3, 4].map((tick) => tick * monthAxisStep);

  return (
    <div
      className="space-y-6 p-6 lg:p-8"
      style={{ background: "linear-gradient(160deg, hsl(var(--stage-1) / 0.05), transparent 35%, hsl(var(--stage-5) / 0.05))" }}
    >
      <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 xl:grid-cols-6">
        <StatTile label="Total opportunities" value={String(metrics.total)} icon={Handshake} accent={ACCENT.blue} delay={0} />
        <StatTile label="Won" value={String(metrics.wonCount)} icon={Trophy} accent={ACCENT.green} delay={40} />
        <StatTile label="Lost" value={String(metrics.lostCount)} icon={XCircle} accent={ACCENT.red} delay={80} />
        <BreakdownStatTile
          label="In-Process"
          value={String(metrics.inProcessTotal)}
          icon={Activity}
          accent={ACCENT.orange}
          breakdown={metrics.inProcessBreakdown}
          delay={120}
        />
        <StatTile label="Conversion" value={`${metrics.conversionPct.toFixed(1)}%`} icon={TrendingUp} accent={ACCENT.pink} delay={160} />
        <BreakdownStatTile
          label="No-Bid / Declined"
          value={String(metrics.declinedTotal)}
          icon={Ban}
          accent={ACCENT.gray}
          breakdown={metrics.declinedBreakdown}
          delay={200}
        />
      </div>

      {/* 5 columns at xl: Stage 2 + Industry 2 + compact Win / loss 1. */}
      <div className="grid items-start gap-5 sm:grid-cols-2 xl:grid-cols-5">
        <DonutReportCard
          title="Opportunities by stage"
          icon={Layers}
          data={metrics.byStage}
          itemHeading="Stage"
          valueHeading="Opportunities"
          delay={0}
          {...(hasMenuAccess(OPPORTUNITY_PIPELINE_REPORT_MENU_KEY) && {
            onOpen: () => navigate(OPPORTUNITY_PIPELINE_REPORT_PATH),
            openLabel: "Open the Opportunity Pipeline Report",
          })}
        />
        <DonutReportCard
          title="Opportunities by industry"
          icon={BarChart3}
          data={metrics.byIndustry}
          itemHeading="Industry"
          valueHeading="Opportunities"
          delay={60}
          {...(hasMenuAccess(OPPORTUNITY_INDUSTRY_REPORT_MENU_KEY) && {
            onOpen: () => navigate(OPPORTUNITY_INDUSTRY_REPORT_PATH),
            openLabel: "Open the Opportunity by Industry Report",
          })}
        />
        <WinLossCard
          wonCount={metrics.wonCount}
          lostCount={metrics.lostCount}
          wonValue={metrics.wonValueUsd}
          lostValue={metrics.lostValueUsd}
          wonDeals={metrics.wonDeals}
          lostDeals={metrics.lostDeals}
          delay={120}
          {...(hasMenuAccess(WIN_LOSS_REPORT_MENU_KEY) && {
            onOpen: () => navigate(WIN_LOSS_REPORT_PATH),
            openLabel: "Open the Win/Loss Analysis Report",
          })}
        />
      </div>

      <div className="grid items-start gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <BarListCard
          title="Value by owner (won opportunities)"
          icon={User}
          rows={metrics.valueByOwner}
          valueFormatter={formatMoney}
          barClassName={WON_BAR_CLASS}
          delay={0}
          {...(hasMenuAccess(OPPORTUNITY_OWNER_REPORT_MENU_KEY) && {
            onOpen: () => navigate(OPPORTUNITY_OWNER_REPORT_PATH),
            openLabel: "Open the Opportunity by Owner Report",
          })}
        />
        <BarListCard
          title="Top clients by value (won opportunities)"
          icon={Building2}
          rows={metrics.topClients}
          valueFormatter={formatMoney}
          barClassName={WON_BAR_CLASS}
          delay={60}
          {...(hasMenuAccess(OPPORTUNITY_CLIENT_REPORT_MENU_KEY) && {
            onOpen: () => navigate(OPPORTUNITY_CLIENT_REPORT_PATH),
            openLabel: "Open the Opportunity by Client Report",
          })}
        />
        <BarListCard
          title="Conversion % by owner"
          icon={Target}
          rows={metrics.conversionByOwner}
          valueFormatter={(value) => `${value.toFixed(1)}%`}
          delay={120}
        />
        <PendingApprovalsCard rows={metrics.pendingWithWait} delay={180} />
      </div>

      <ReportCard title={`Opportunities created per month (${metrics.fyLabel})`} icon={TrendingUp} delay={240}>
          <ChartContainer config={MONTH_CHART_CONFIG} className="aspect-auto h-[300px] w-full">
            <BarChart data={metrics.createdPerMonth} margin={{ left: 0, right: 12, top: 20 }} barCategoryGap="22%">
              <defs>
                <linearGradient id="peak-month-bar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(224 80% 58%)" />
                  <stop offset="100%" stopColor="hsl(224 76% 40%)" />
                </linearGradient>
                <linearGradient id="month-bar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary) / 0.55)" />
                  <stop offset="100%" stopColor="hsl(var(--primary) / 0.35)" />
                </linearGradient>
                <marker id="peak-month-arrow" markerWidth="10" markerHeight="10" refX="7" refY="5" orient="auto" markerUnits="userSpaceOnUse">
                  <path d="M0,0 L10,5 L0,10 z" fill="hsl(var(--primary))" />
                </marker>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="4 4" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={{ stroke: "hsl(var(--border))", strokeWidth: 1.5 }}
                interval={0}
                tick={{ fontSize: 13, fontWeight: 700, fill: "hsl(var(--foreground))" }}
                tickMargin={12}
              />
              <YAxis
                width={36}
                allowDecimals={false}
                tickLine={false}
                axisLine={{ stroke: "hsl(var(--border))", strokeWidth: 1.5 }}
                tick={{ fontSize: 12.5, fontWeight: 700, fill: "hsl(var(--muted-foreground))" }}
                tickMargin={8}
                ticks={monthAxisTicks}
                domain={[0, monthAxisTicks[monthAxisTicks.length - 1]]}
              />
              <ChartTooltip
                cursor={{ fill: "hsl(var(--muted))" }}
                content={
                  <ChartTooltipContent
                    formatter={(value, name) => (
                      <div className="flex w-full items-center justify-between gap-4">
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <span className="size-2.5 shrink-0 rounded-[2px]" style={{ backgroundColor: "hsl(var(--primary))" }} />
                          {name}
                        </span>
                        <span className="font-mono font-semibold tabular-nums" style={{ color: "hsl(var(--primary))" }}>
                          {value}
                        </span>
                      </div>
                    )}
                  />
                }
              />
              <Bar
                dataKey="count"
                fill="var(--color-count)"
                radius={[8, 8, 0, 0]}
                isAnimationActive
                animationDuration={700}
                animationEasing="ease-out"
                maxBarSize={64}
                label={peakMonthValue > 0 ? monthBarLabel(peakMonthIndex, metrics.createdPerMonth.length) : undefined}
              >
                {/* Light bars, with the peak month in a strong gradient. */}
                {metrics.createdPerMonth.map((month, index) => (
                  <Cell
                    key={month.month}
                    fill={peakMonthValue > 0 && index === peakMonthIndex ? "url(#peak-month-bar)" : "url(#month-bar)"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
      </ReportCard>
    </div>
  );
}
