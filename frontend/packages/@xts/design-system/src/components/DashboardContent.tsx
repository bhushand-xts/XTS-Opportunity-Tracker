import { useEffect, useState } from "react";
import { CalendarClock, ClipboardCheck, Clock, Percent, TrendingUp, Trophy, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription } from "@/components/ui/empty";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemSeparator,
  ItemTitle,
} from "@/components/ui/item";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { STAGES } from "@/lib/mock-data";
import { useSetPageTitle } from "@/lib/pageTitle";
import { formatMoney, riskOf, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export function DashboardContent() {
  useSetPageTitle("Dashboard");
  const { visibleOpportunities, activities, approvals, role, userById, history, opportunities, decideApproval } = useStore();
  const open = visibleOpportunities.filter((opportunity) => opportunity.stage !== "Closed");
  const openValue = open.reduce((sum, opportunity) => sum + opportunity.value, 0);
  const weighted = open.reduce((sum, opportunity) => sum + (opportunity.value * opportunity.probability) / 100, 0);
  const closed = visibleOpportunities.filter((opportunity) => opportunity.closure);
  const won = closed.filter((opportunity) => opportunity.closure?.outcome === "Won");
  const lost = closed.filter((opportunity) => opportunity.closure?.outcome === "Lost");
  const winRate = won.length + lost.length ? Math.round((won.length / (won.length + lost.length)) * 100) : 0;
  const [today, setToday] = useState<string | null>(null);
  useEffect(() => setToday(new Date().toISOString().slice(0, 10)), []);

  const closingSoon = today ? open.filter((opportunity) => riskOf(opportunity) === "soon") : [];
  const overdue = today
    ? activities.filter((activity) => (activity.type === "Follow-up" || activity.type === "Task") && !activity.done && activity.date < today).slice(0, 5)
    : [];
  const pending = approvals.filter((approval) => approval.status === "Pending");
  const canApprove = role === "Sales Manager" || role === "Sales Head" || role === "System Admin";
  const kpis = [
    { label: "Open pipeline value", value: formatMoney(openValue), icon: Wallet },
    { label: "Weighted forecast", value: formatMoney(weighted), icon: TrendingUp },
    { label: "Won this period", value: formatMoney(won.reduce((sum, opportunity) => sum + opportunity.value, 0)), icon: Trophy },
    { label: "Win rate", value: `${winRate}%`, icon: Percent },
    { label: "Closing this week", value: String(closingSoon.length), icon: CalendarClock },
  ];
  const maxStage = Math.max(...STAGES.map((stage) => open.filter((opportunity) => opportunity.stage === stage).length), 1);

  return (
    <div className="space-y-4 p-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {kpis.map((kpi, index) => (
          <div key={kpi.label} className="card-surface flex items-start gap-3 p-4">
            <div
              className="grid size-9 shrink-0 place-items-center rounded-lg"
              style={{ background: `hsl(var(--stage-${index + 1}) / 0.12)`, color: `hsl(var(--stage-${index + 1}))` }}
            >
              <kpi.icon className="size-[18px]" />
            </div>
            <div className="min-w-0">
              <p className="text-[11.5px] uppercase tracking-wide text-muted-foreground">{kpi.label}</p>
              <p className="mt-1 text-xl font-semibold tracking-tight">{kpi.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card-surface p-4 lg:col-span-2">
          <h2 className="mb-3 text-[13px] font-semibold">Pipeline funnel</h2>
          <TooltipProvider delayDuration={150}>
            <div className="space-y-2">
              {STAGES.filter((stage) => stage !== "Closed").map((stage, index) => {
                const list = open.filter((opportunity) => opportunity.stage === stage);
                const value = list.reduce((sum, opportunity) => sum + opportunity.value, 0);
                return (
                  <div key={stage} className="flex items-center gap-3">
                    <span className="flex w-40 shrink-0 items-center gap-1.5 truncate text-[12.5px] text-muted-foreground">
                      <span
                        className="size-2 shrink-0 rounded-full"
                        style={{ background: `hsl(var(--stage-${index + 1}))` }}
                      />
                      {stage}
                    </span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="h-6 flex-1 rounded bg-secondary">
                          <div
                            className="h-6 rounded transition-[width] duration-300"
                            style={{ width: `${(list.length / maxStage) * 100}%`, background: `hsl(var(--stage-${index + 1}))` }}
                          />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        {list.length} {list.length === 1 ? "opportunity" : "opportunities"} · {formatMoney(value)}
                      </TooltipContent>
                    </Tooltip>
                    <span className="w-28 shrink-0 text-right text-[12.5px] font-medium">{formatMoney(value)}</span>
                    <span className="w-14 shrink-0 text-right text-[12.5px] text-muted-foreground">{list.length}</span>
                  </div>
                );
              })}
            </div>
          </TooltipProvider>
        </div>

        <div className="card-surface p-4">
          <h2 className="mb-3 text-[13px] font-semibold">My overdue follow-ups</h2>
          {overdue.length === 0 ? (
            <Empty className="py-6">
              <EmptyDescription>Nothing overdue. Nice.</EmptyDescription>
            </Empty>
          ) : (
            <ItemGroup>
              {overdue.map((activity, index) => {
                const opportunity = opportunities.find((item) => item.id === activity.opportunityId);
                return (
                  <div key={activity.id}>
                    <Item size="sm">
                      <ItemMedia variant="icon" className="bg-destructive/10 text-destructive">
                        <Clock />
                      </ItemMedia>
                      <ItemContent>
                        <ItemTitle>
                          <a href={`/opportunity/${activity.opportunityId}`} className="rounded-sm outline-none hover:text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                            {opportunity?.name}
                          </a>
                        </ItemTitle>
                        <ItemDescription>
                          {activity.subject} · <span className="text-destructive">due {activity.date}</span>
                        </ItemDescription>
                      </ItemContent>
                    </Item>
                    {index < overdue.length - 1 && <ItemSeparator />}
                  </div>
                );
              })}
            </ItemGroup>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {canApprove && (
          <div className="card-surface p-4">
            <h2 className="mb-3 text-[13px] font-semibold">Pending approvals</h2>
            {pending.length === 0 ? (
              <Empty className="py-6">
                <EmptyDescription>No requests waiting on you.</EmptyDescription>
              </Empty>
            ) : (
              <ItemGroup>
                {pending.map((approval, index) => {
                  const opportunity = opportunities.find((item) => item.id === approval.opportunityId);
                  return (
                    <div key={approval.id}>
                      <Item size="sm">
                        <ItemMedia variant="icon">
                          <ClipboardCheck />
                        </ItemMedia>
                        <ItemContent>
                          <ItemTitle>
                            <a href={`/opportunity/${approval.opportunityId}`} className="rounded-sm outline-none hover:text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                              {opportunity?.name}
                            </a>
                          </ItemTitle>
                          <ItemDescription>
                            {approval.type} · {userById(approval.requestedBy)?.name} · {formatMoney(opportunity?.value ?? 0)}
                          </ItemDescription>
                        </ItemContent>
                        <ItemActions>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-[12px]"
                            onClick={() => {
                              decideApproval(approval.id, "Rejected", "Rejected from dashboard");
                              toast.success("Rejected");
                            }}
                          >
                            Reject
                          </Button>
                          <Button
                            size="sm"
                            className="h-7 text-[12px]"
                            onClick={() => {
                              decideApproval(approval.id, "Approved", "Approved from dashboard");
                              toast.success("Approved");
                            }}
                          >
                            Approve
                          </Button>
                        </ItemActions>
                      </Item>
                      {index < pending.length - 1 && <ItemSeparator />}
                    </div>
                  );
                })}
              </ItemGroup>
            )}
          </div>
        )}

        <div className={cn("card-surface p-4", !canApprove && "lg:col-span-2")}>
          <h2 className="mb-3 text-[13px] font-semibold">Recent activity</h2>
          <ItemGroup>
            {[...history].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 8).map((entry, index, all) => {
              const opportunity = opportunities.find((item) => item.id === entry.opportunityId);
              return (
                <div key={entry.id}>
                  <Item size="sm" className="gap-2.5 p-2">
                    <Badge variant="secondary" className="h-5 shrink-0 text-[10.5px]">
                      {entry.what}
                    </Badge>
                    <span className="min-w-0 flex-1 truncate text-[13px]">{opportunity?.name}</span>
                    <span className="whitespace-nowrap text-[11.5px] text-muted-foreground">{entry.date}</span>
                  </Item>
                  {index < all.length - 1 && <ItemSeparator />}
                </div>
              );
            })}
          </ItemGroup>
        </div>
      </div>
    </div>
  );
}