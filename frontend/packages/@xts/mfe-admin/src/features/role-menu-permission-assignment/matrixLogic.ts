import type { Menu, MenuPermissionMapping } from "@xts/api-contracts";
import type { MenuRow } from "../menu-management/menu.utils";
import { grantKey } from "./useRoleMenuPermissions";

/** menuId -> the permission ids that may be granted on it. */
export function permissionsByMenu(availableByMenu: Map<number, MenuPermissionMapping[]>): Map<number, Set<number>> {
  return new Map([...availableByMenu].map(([menuId, list]) => [menuId, new Set(list.map((m) => m.permissionId))]));
}

/**
 * Which menu rows to show. A menu is shown if it has permissions (or
 * `showEmpty` is on) and matches the search — and so are its parents, so the
 * hierarchy stays readable. Order and depth come from `rows`.
 */
export function visibleRows(
  rows: MenuRow[],
  hasPermissions: (menuId: number) => boolean,
  options: { search: string; showEmpty: boolean }
): MenuRow[] {
  const byId = new Map<number, Menu>(rows.map(({ menu }) => [menu.menuId, menu]));
  const query = options.search.trim().toLowerCase();
  const shown = new Set<number>();

  for (const { menu } of rows) {
    if (!options.showEmpty && !hasPermissions(menu.menuId)) continue;
    if (query && !menu.menuName.toLowerCase().includes(query)) continue;
    // keep the menu and every parent above it
    for (let current: Menu | undefined = menu; current && !shown.has(current.menuId); current = byId.get(current.parentId ?? -1)) {
      shown.add(current.menuId);
    }
  }
  return rows.filter(({ menu }) => shown.has(menu.menuId));
}

/** Initials for the role avatar: "Sales Manager" -> "SM", "Admin" -> "AD". */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export { grantKey };
