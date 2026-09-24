import type { Menu } from "@xts/api-contracts";
// Shared with the sidebar (AppShell), which also needs to resolve a menu's
// `icon` string to a component — kept in @xts/design-system, which both
// mfe-admin and the sidebar depend on, so there's one lookup, not two.
export { resolveIcon, ICON_OPTIONS } from "@xts/design-system";

export function slugify(value: string, separator = "-"): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, separator)
    .replace(new RegExp(`(^${separator}|${separator}$)`, "g"), "");
}

export interface MenuRow {
  menu: Menu;
  depth: number;
}

/** Orders menus as a tree — each parent directly followed by its children,
 * siblings by `sortOrder` — and records how deep each one sits. A menu whose
 * parent is missing is shown at the top level rather than dropped. */
export function flattenMenus(menus: Menu[]): MenuRow[] {
  const ids = new Set(menus.map((m) => m.menuId));
  const bySort = (a: Menu, b: Menu) => a.sortOrder - b.sortOrder || a.menuId - b.menuId;
  const childrenOf = (parentId: number | null) =>
    menus.filter((m) => (parentId === null ? m.parentId === null || !ids.has(m.parentId) : m.parentId === parentId)).sort(bySort);

  const rows: MenuRow[] = [];
  const visit = (parentId: number | null, depth: number, seen: Set<number>) => {
    for (const menu of childrenOf(parentId)) {
      if (seen.has(menu.menuId)) continue; // guards against a corrupt parent cycle
      seen.add(menu.menuId);
      rows.push({ menu, depth });
      visit(menu.menuId, depth + 1, seen);
    }
  };
  visit(null, 0, new Set());
  return rows;
}

/** The next free sort order for a new menu under the given parent (one past
 * the highest sort order already used by its siblings). */
export function nextSortOrder(menus: Menu[], parentId: number | null): number {
  const siblings = menus.filter((m) => m.parentId === parentId);
  return siblings.length === 0 ? 1 : Math.max(...siblings.map((m) => m.sortOrder)) + 1;
}

/** The menu itself plus every menu beneath it — none of these may become the
 * menu's new parent (the backend rejects a circular hierarchy). */
export function descendantIds(menus: Menu[], menuId: number): Set<number> {
  const result = new Set<number>([menuId]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const m of menus) {
      if (m.parentId !== null && result.has(m.parentId) && !result.has(m.menuId)) {
        result.add(m.menuId);
        grew = true;
      }
    }
  }
  return result;
}
