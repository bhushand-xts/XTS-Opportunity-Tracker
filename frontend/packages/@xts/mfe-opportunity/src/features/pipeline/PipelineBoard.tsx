import { Plus } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  BOARD_COLUMNS,
  formatMoney,
  STAGES,
  useSetPageTitle,
  useStore,
  type Opportunity,
} from "@xts/design-system";
import { PageHeader } from "../../components/PageHeader";
import { SelectClientDialog } from "../opportunity-create/SelectClientDialog";

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

function OpportunityCard({ opportunity, owner, gate }: { opportunity: Opportunity; owner?: string; gate?: string }) {
  const stageIndex = STAGES.indexOf(opportunity.stage);
  return (
    <div className="cursor-pointer rounded-lg border bg-card p-3 shadow-sm transition-colors hover:border-primary/40">
      <div className="mb-1.5 flex items-center gap-1.5">
        {opportunity.rfpType && (
          <Badge variant={opportunity.rfpType === "Questionnaire" ? "default" : "secondary"} className="text-[10px]">
            {opportunity.rfpType}
          </Badge>
        )}
        {gate && (
          <Badge variant="warning" className="text-[10px]">
            Awaiting {gate}
          </Badge>
        )}
      </div>
      <p className="text-[12.8px] font-semibold leading-snug">{opportunity.name}</p>
      <div className="mt-2 flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
        <Avatar className="size-[22px]">
          <AvatarFallback className="text-[10px]">{owner ? initialsOf(owner) : "?"}</AvatarFallback>
        </Avatar>
        <span className="ml-auto font-semibold text-foreground">{formatMoney(opportunity.value)}</span>
      </div>
      <div className="mt-2.5 flex gap-[3px]">
        {STAGES.map((stage, i) => (
          <span
            key={stage}
            className={`h-[3px] flex-1 rounded-sm ${i < stageIndex ? "bg-primary" : "bg-muted"}`}
          />
        ))}
      </div>
    </div>
  );
}

export function PipelineBoard() {
  useSetPageTitle("Pipeline");
  const navigate = useNavigate();
  const { opportunities, users } = useStore();
  const [selectClientOpen, setSelectClientOpen] = useState(false);

  const open = opportunities.filter((o) => !o.closure);
  const openValue = open.reduce((sum, o) => sum + o.value, 0);
  const weighted = open.reduce((sum, o) => sum + (o.value * o.probability) / 100, 0);
  const awaitingGate = open.filter((o) => BOARD_COLUMNS.find((c) => c.stage === o.stage)?.gate).length;
  const decided = opportunities.filter((o) => o.closure);
  const won = decided.filter((o) => o.closure?.outcome === "Won");
  const winRate = decided.length ? Math.round((won.length / decided.length) * 100) : 0;

  const ownerName = (id: string) => users.find((u) => u.id === id)?.name;

  const metrics = [
    { k: "Open pipeline", v: formatMoney(openValue), s: `${open.length} active opportunities` },
    { k: "Weighted value", v: formatMoney(weighted), s: "stage-probability adjusted" },
    { k: "Awaiting gate", v: String(awaitingGate), s: `across ${BOARD_COLUMNS.filter((c) => c.gate).length} gates` },
    { k: "Win rate", v: `${winRate}%`, s: "won ÷ decided" },
  ];

  return (
    <div className="space-y-4 p-5">
      <PageHeader
        description="All active opportunities across the qualification-to-close lifecycle."
        actions={
          <Button onClick={() => setSelectClientOpen(true)}>
            <Plus className="mr-2 size-4" />
            New opportunity
          </Button>
        }
      />

      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((m) => (
          <div key={m.k} className="rounded-lg border bg-card p-4">
            <p className="text-xs font-medium text-muted-foreground">{m.k}</p>
            <p className="mt-1.5 text-2xl font-bold tracking-tight">{m.v}</p>
            <p className="mt-0.5 text-[11.5px] text-muted-foreground/80">{m.s}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-3.5 overflow-x-auto pb-2">
        {BOARD_COLUMNS.map((column) => {
          const items = open.filter((o) => o.stage === column.stage);
          return (
            <div key={column.stage} className="flex w-60 shrink-0 flex-col rounded-lg border bg-muted/40">
              <div className="flex items-center gap-2 px-3 py-2.5 text-[12.5px] font-semibold">
                {column.stage}
                {column.gate && (
                  <Badge variant="warning" className="px-1.5 text-[10px]">
                    {column.gate}
                  </Badge>
                )}
                <span className="ml-auto rounded-full border bg-card px-1.5 text-[11px] font-semibold text-muted-foreground">
                  {items.length}
                </span>
              </div>
              <div className="flex flex-col gap-2.5 overflow-y-auto px-2.5 pb-2.5">
                {items.map((opportunity) => (
                  <OpportunityCard
                    key={opportunity.id}
                    opportunity={opportunity}
                    owner={ownerName(opportunity.ownerId)}
                    gate={column.gate}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <SelectClientDialog
        open={selectClientOpen}
        onOpenChange={setSelectClientOpen}
        onSelectClient={(customer) => navigate("/opportunities/new", { state: { customerId: customer.id } })}
        onNewClient={() => navigate("/opportunities/new")}
      />
    </div>
  );
}
