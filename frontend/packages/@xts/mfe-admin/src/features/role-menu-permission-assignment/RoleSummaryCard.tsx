import { ShieldCheck } from "lucide-react";
import type { Role } from "@xts/api-contracts";
import {
  Badge,
  Card,
  CardContent,
  Label,
  Progress,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
} from "@xts/design-system";
import { initials } from "./matrixLogic";

export interface AccessStats {
  menusWithAccess: number;
  menusTotal: number;
  granted: number;
  total: number;
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">
        {value}
        {hint ? <span className="text-sm font-normal text-muted-foreground"> {hint}</span> : null}
      </p>
    </div>
  );
}

/** Who you are editing (the role picker) and how much access the role holds. */
export function RoleSummaryCard({
  roles,
  role,
  onSelect,
  loading,
  stats,
  statsLoading,
}: {
  roles: Role[];
  role: Role | undefined;
  onSelect: (roleId: number) => void;
  loading: boolean;
  stats: AccessStats;
  statsLoading: boolean;
}) {
  const percent = stats.total === 0 ? 0 : Math.round((stats.granted / stats.total) * 100);

  return (
    <Card>
      <CardContent className="space-y-5 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <div
              className={
                role
                  ? "grid size-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-base font-semibold text-primary"
                  : "grid size-12 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground"
              }
            >
              {role ? initials(role.roleName) : <ShieldCheck className="size-6" />}
            </div>
            <div className="min-w-0">
              {role ? (
                <>
                  <h2 className="truncate text-lg font-semibold tracking-tight">{role.roleName}</h2>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    {role.roleCode && <Badge variant="muted" className="font-mono text-[11px]">{role.roleCode}</Badge>}
                    <Badge variant="success">Active</Badge>
                    {role.description && <span className="truncate">{role.description}</span>}
                  </div>
                </>
              ) : (
                <>
                  <h2 className="text-lg font-semibold tracking-tight">Choose a role</h2>
                  <p className="text-sm text-muted-foreground">Pick the role whose access you want to view or change.</p>
                </>
              )}
            </div>
          </div>

          <div className="w-full space-y-1.5 sm:w-72">
            <Label htmlFor="role-select" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Role
            </Label>
            {loading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Select value={role ? String(role.id) : undefined} onValueChange={(v) => onSelect(Number(v))}>
                <SelectTrigger id="role-select" className="h-10">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r.id} value={String(r.id)}>
                      {r.roleName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {!loading && roles.length === 0 && (
              <p className="text-xs text-muted-foreground">No active roles. Add one in Role Master first.</p>
            )}
          </div>
        </div>

        {role && (
          <div className="grid gap-6 border-t pt-5 sm:grid-cols-3">
            {statsLoading ? (
              <>
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </>
            ) : (
              <>
                <Stat label="Menus with access" value={`${stats.menusWithAccess}`} hint={`of ${stats.menusTotal}`} />
                <Stat label="Permissions granted" value={`${stats.granted}`} hint={`of ${stats.total}`} />
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Coverage</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">{percent}%</p>
                  <Progress value={percent} className="mt-2 h-1.5" aria-label="Share of available permissions granted" />
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
