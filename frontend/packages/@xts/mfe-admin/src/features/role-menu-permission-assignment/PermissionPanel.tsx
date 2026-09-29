import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Folder, MousePointerClick, Search } from "lucide-react";
import type { MenuPermissionMapping } from "@xts/api-contracts";
import { Button, Checkbox, Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle, Input, Skeleton } from "@xts/design-system";
import { resolveIcon } from "../menu-management/menu.utils";
import type { Menu } from "@xts/api-contracts";
import { grantKey } from "./useRoleMenuPermissions";

/** Show the permission filter once a menu has more permissions than fit comfortably on screen. */
const FILTER_FROM = 8;

/**
 * The permissions of one menu as a grid of tick boxes — the place where a
 * role's access is actually changed. Scales to any number of permissions: the
 * grid wraps, and above a handful it gets a filter box.
 */
export function PermissionPanel({
  menu,
  parentName,
  permissions,
  selected,
  granted,
  loading,
  onToggle,
  onSetAll,
  disabled = false,
}: {
  menu: Menu | undefined;
  parentName?: string;
  permissions: MenuPermissionMapping[];
  selected: Set<string>;
  /** what the server holds — a box that differs from it gets an "unsaved" dot */
  granted: Set<string>;
  loading: boolean;
  onToggle: (permissionId: number, checked: boolean) => void;
  onSetAll: (checked: boolean) => void;
  /** Read-only mode — checkboxes and Select all/Clear are shown but can't be changed. */
  disabled?: boolean;
}) {
  const [filter, setFilter] = useState("");

  const sorted = useMemo(() => [...permissions].sort((a, b) => a.permissionName.localeCompare(b.permissionName)), [permissions]);
  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return q ? sorted.filter((p) => `${p.permissionName} ${p.permissionKey}`.toLowerCase().includes(q)) : sorted;
  }, [sorted, filter]);

  if (loading) {
    return (
      <div className="space-y-4 rounded-xl border bg-card p-6 shadow-sm">
        <Skeleton className="h-7 w-56" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 9 }, (_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!menu) {
    return (
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <MousePointerClick />
            </EmptyMedia>
            <EmptyTitle>Select a menu</EmptyTitle>
            <EmptyDescription>Choose a menu on the left to see and change what this role can do on it.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  const Icon = resolveIcon(menu.icon) ?? Folder;
  const total = permissions.length;
  const ticked = permissions.filter((p) => selected.has(grantKey(menu.menuId, p.permissionId))).length;

  return (
    <div className="rounded-xl border bg-card shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b p-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <Icon className="size-5" />
          </span>
          <div className="min-w-0">
            {parentName && <p className="truncate text-xs text-muted-foreground">{parentName}</p>}
            <h3 className="truncate text-base font-semibold tracking-tight">{menu.menuName}</h3>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium tabular-nums text-foreground">{ticked}</span> of {total}{" "}
              {total === 1 ? "permission" : "permissions"} granted
            </p>
          </div>
        </div>

        {total > 0 && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={disabled || ticked === total} onClick={() => onSetAll(true)}>
              Select all
            </Button>
            <Button variant="outline" size="sm" disabled={disabled || ticked === 0} onClick={() => onSetAll(false)}>
              Clear
            </Button>
          </div>
        )}
      </div>

      {total === 0 ? (
        <div className="p-8 text-center text-sm text-muted-foreground">
          No permissions are mapped to this menu.{" "}
          <Link className="font-medium text-primary underline-offset-2 hover:underline" to="/admin/menu-management/menu-permission-mapping">
            Map permissions
          </Link>
        </div>
      ) : (
        <div className="space-y-4 p-5">
          {total >= FILTER_FROM && (
            <div className="relative max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder={`Filter ${total} permissions`}
                aria-label="Filter permissions"
                className="h-9 pl-9"
              />
            </div>
          )}

          {visible.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No permissions match &quot;{filter}&quot;.</p>
          ) : (
            <ul className="grid max-h-[520px] gap-3 overflow-y-auto pr-1 sm:grid-cols-2 xl:grid-cols-3">
              {visible.map((p) => {
                const key = grantKey(menu.menuId, p.permissionId);
                const isOn = selected.has(key);
                const changed = isOn !== granted.has(key);
                const id = `grant-${menu.menuId}-${p.permissionId}`;
                return (
                  <li key={p.permissionId}>
                    <label
                      htmlFor={id}
                      className={`relative flex h-full cursor-pointer items-start gap-3 rounded-lg border p-3.5 transition-colors ${
                        isOn ? "border-primary/40 bg-primary/5" : "hover:border-primary/30 hover:bg-muted/40"
                      }`}
                    >
                      <Checkbox
                        id={id}
                        checked={isOn}
                        disabled={disabled}
                        onCheckedChange={(v) => onToggle(p.permissionId, v === true)}
                        className="mt-0.5"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{p.permissionName}</span>
                        <span className="mt-0.5 block truncate font-mono text-[11px] text-muted-foreground">{p.permissionKey}</span>
                      </span>
                      {changed && (
                        <span className="absolute right-2.5 top-2.5 size-1.5 rounded-full bg-amber-500" title="Unsaved change" aria-label="Unsaved change" />
                      )}
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
