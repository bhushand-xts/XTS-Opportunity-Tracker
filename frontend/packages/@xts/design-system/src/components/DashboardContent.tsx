import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
    { label: "Open pipeline value", value: formatMoney(openValue) },
    { label: "Weighted forecast", value: formatMoney(weighted) },
    { label: "Won this period", value: formatMoney(won.reduce((sum, opportunity) => sum + opportunity.value, 0)) },
    { label: "Win rate", value: `${winRate}%` },
    { label: "Closing this week", value: String(closingSoon.length) },
  ];
  const maxStage = Math.max(...STAGES.map((stage) => open.filter((opportunity) => opportunity.stage === stage).length), 1);

  return (
    <div className="space-y-4 p-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="card-surface p-4">
            <p className="text-[11.5px] uppercase tracking-wide text-muted-foreground">{kpi.label}</p>
            <p className="mt-1.5 text-xl font-semibold tracking-tight">{kpi.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card-surface p-4 lg:col-span-2">
          <h2 className="mb-3 text-[13px] font-semibold">Pipeline funnel</h2>
          <div className="space-y-2">
            {STAGES.filter((stage) => stage !== "Closed").map((stage, index) => {
              const list = open.filter((opportunity) => opportunity.stage === stage);
              const value = list.reduce((sum, opportunity) => sum + opportunity.value, 0);
              return (
                <div key={stage} className="flex items-center gap-3">
                  <span className="w-40 shrink-0 truncate text-[12.5px] text-muted-foreground">{stage}</span>
                  <div className="h-6 flex-1 rounded bg-secondary">
                    <div className="h-6 rounded" style={{ width: `${(list.length / maxStage) * 100}%`, background: `hsl(var(--stage-${index + 1}))` }} />
                  </div>
                  <span className="w-28 shrink-0 text-right text-[12.5px] font-medium">{formatMoney(value)}</span>
                  <span className="w-14 shrink-0 text-right text-[12.5px] text-muted-foreground">{list.length}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card-surface p-4">
          <h2 className="mb-3 text-[13px] font-semibold">My overdue follow-ups</h2>
          {overdue.length === 0 ? <p className="py-6 text-center text-[13px] text-muted-foreground">Nothing overdue. Nice.</p> : (
            <ul className="space-y-2.5">
              {overdue.map((activity) => {
                const opportunity = opportunities.find((item) => item.id === activity.opportunityId);
                return <li key={activity.id} className="text-[13px]"><a href={`/opportunity/${activity.opportunityId}`} className="font-medium hover:text-primary hover:underline">{opportunity?.name}</a><p className="text-[12px] text-muted-foreground">{activity.subject} · <span className="text-destructive">due {activity.date}</span></p></li>;
              })}
            </ul>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {canApprove && (
          <div className="card-surface p-4">
            <h2 className="mb-3 text-[13px] font-semibold">Pending approvals</h2>
            {pending.length === 0 ? <p className="py-6 text-center text-[13px] text-muted-foreground">No requests waiting on you.</p> : (
              <ul className="divide-y">
                {pending.map((approval) => {
                  const opportunity = opportunities.find((item) => item.id === approval.opportunityId);
                  return (
                    <li key={approval.id} className="flex items-center gap-3 py-2.5">
                      <div className="min-w-0"><a href={`/opportunity/${approval.opportunityId}`} className="block truncate text-[13px] font-medium hover:text-primary hover:underline">{opportunity?.name}</a><p className="text-[12px] text-muted-foreground">{approval.type} · {userById(approval.requestedBy)?.name} · {formatMoney(opportunity?.value ?? 0)}</p></div>
                      <div className="ml-auto flex gap-1.5">
                        <Button size="sm" variant="outline" className="h-7 text-[12px]" onClick={() => { decideApproval(approval.id, "Rejected", "Rejected from dashboard"); toast.success("Rejected"); }}>Reject</Button>
                        <Button size="sm" className="h-7 text-[12px]" onClick={() => { decideApproval(approval.id, "Approved", "Approved from dashboard"); toast.success("Approved"); }}>Approve</Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        <div className={cn("card-surface p-4", !canApprove && "lg:col-span-2")}>
          <h2 className="mb-3 text-[13px] font-semibold">Recent activity</h2>
          <ul className="space-y-2.5">
            {[...history].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 8).map((entry) => {
              const opportunity = opportunities.find((item) => item.id === entry.opportunityId);
              return <li key={entry.id} className="flex items-baseline gap-2 text-[13px]"><Badge variant="secondary" className="h-5 text-[10.5px]">{entry.what}</Badge><span className="truncate">{opportunity?.name}</span><span className="ml-auto whitespace-nowrap text-[11.5px] text-muted-foreground">{entry.date}</span></li>;
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}