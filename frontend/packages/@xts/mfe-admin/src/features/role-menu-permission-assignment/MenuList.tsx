import { Folder } from "lucide-react";
import { Input, Label, Switch } from "@xts/design-system";
import { Search } from "lucide-react";
import { resolveIcon, type MenuRow } from "../menu-management/menu.utils";

/** How much of a menu's available access the role holds, for the small badge at the end of each row. */
function CountBadge({ granted, total }: { granted: number; total: number }) {
  if (total === 0) return <span className="text-xs text-muted-foreground/70">none</span>;
  const tone =
    granted === 0
      ? "bg-muted text-muted-foreground"
      : granted === total
        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
        : "bg-primary/10 text-primary";
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium tabular-nums ${tone}`} aria-label={`${granted} of ${total} granted`}>
      {granted}/{total}
    </span>
  );
}

/**
 * The menus of the application as a list, with how many permissions the role
 * holds on each. Pick one to edit it in the panel next to this list. Menus
 * that only group others show as small headings.
 */
export function MenuList({
  rows,
  activeMenuId,
  onSelect,
  counts,
  search,
  onSearch,
  showEmpty,
  onShowEmpty,
  hiddenEmptyMenus,
  changedMenuIds,
}: {
  rows: MenuRow[];
  activeMenuId: number | undefined;
  onSelect: (menuId: number) => void;
  counts: (menuId: number) => { granted: number; total: number };
  search: string;
  onSearch: (value: string) => void;
  showEmpty: boolean;
  onShowEmpty: (value: boolean) => void;
  hiddenEmptyMenus: number;
  changedMenuIds: Set<number>;
}) {
  return (
    <div className="flex flex-col rounded-xl border bg-card shadow-sm">
      <div className="space-y-3 border-b p-4">
        <h3 className="text-sm font-semibold">Menus</h3>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search menus"
            aria-label="Search menus"
            className="h-9 pl-9"
          />
        </div>
      </div>

      <nav aria-label="Menus" className="max-h-[560px] flex-1 overflow-y-auto p-2">
        {rows.length === 0 && (
          <p className="px-3 py-8 text-center text-sm text-muted-foreground">
            {search ? `No menus match "${search}".` : "No menus with permissions yet."}
          </p>
        )}
        <ul className="space-y-0.5">
          {rows.map(({ menu, depth }) => {
            const { granted, total } = counts(menu.menuId);
            const Icon = resolveIcon(menu.icon) ?? Folder;
            const hasChildren = rows.some((r) => r.menu.parentId === menu.menuId);

            // Only groups other menus: a heading, not something to click.
            if (total === 0 && hasChildren) {
              return (
                <li key={menu.menuId} className="px-3 pb-1 pt-3" style={{ paddingLeft: 12 + depth * 16 }}>
                  <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    <Icon className="size-3.5" />
                    {menu.menuName}
                  </span>
                </li>
              );
            }

            const active = menu.menuId === activeMenuId;
            return (
              <li key={menu.menuId}>
                <button
                  type="button"
                  id={`menu-item-${menu.menuId}`}
                  aria-current={active ? "true" : undefined}
                  onClick={() => onSelect(menu.menuId)}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    active ? "bg-accent font-medium text-accent-foreground" : "hover:bg-muted/70"
                  }`}
                  style={{ paddingLeft: 12 + depth * 16 }}
                >
                  <span
                    className={`grid size-7 shrink-0 place-items-center rounded-md ${
                      active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <Icon className="size-3.5" />
                  </span>
                  <span className="min-w-0 flex-1 truncate">{menu.menuName}</span>
                  {changedMenuIds.has(menu.menuId) && (
                    <span className="size-1.5 shrink-0 rounded-full bg-amber-500" title="Unsaved change" aria-label="Unsaved change" />
                  )}
                  <CountBadge granted={granted} total={total} />
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="flex items-center gap-2 border-t p-3">
        <Switch id="show-empty" checked={showEmpty} onCheckedChange={onShowEmpty} />
        <Label htmlFor="show-empty" className="cursor-pointer text-xs font-normal text-muted-foreground">
          Show menus without permissions{hiddenEmptyMenus > 0 ? ` (${hiddenEmptyMenus})` : ""}
        </Label>
      </div>
    </div>
  );
}
