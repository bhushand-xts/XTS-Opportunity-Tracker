import { useMemo } from "react";
import { useQuery } from "@apollo/client";
import type { LucideIcon } from "lucide-react";
import { useAuth } from "./auth";
import { MENUS, ROLE_ACCESS } from "./menu.queries";
import { resolveIcon } from "./menuIcons";
import { MENU_ROUTES } from "./menuRoutes";

// A short poll, not a push mechanism — cheap way to satisfy "the sidebar
// reflects updated access" (AC9) without new backend infrastructure. Also
// refetches for free whenever Apollo's normal cache-and-network kicks in
// (e.g. remount after navigating back into the app shell).
const ROLE_ACCESS_POLL_MS = 2 * 60 * 1000;

interface SidebarMenu {
  menuId: number;
  menuName: string;
  menuKey: string;
  icon: string | null;
  parentId: number | null;
  sortOrder: number;
  isActive: boolean;
}

interface RoleAccessRow {
  menuId: number;
  permissionId: number;
  permissionKey: string;
}

export interface MenuNode {
  menuId: number;
  menuName: string;
  menuKey: string;
  icon: LucideIcon | null;
  /** The route this menu opens, or null if nothing is wired up for it yet
   * (see menuRoutes.ts) — such menus still render, just disabled. */
  path: string | null;
  children: MenuNode[];
}

/** A menu is visible if the role holds it directly, or if any menu beneath
 * it is held — a purely structural parent (e.g. "Menu Management") still
 * needs to show up to reach an accessible child. */
function computeVisibleIds(menus: SidebarMenu[], accessibleIds: Set<number>): Set<number> {
  const byId = new Map(menus.map((m) => [m.menuId, m]));
  const visible = new Set<number>();
  for (const id of accessibleIds) {
    let current: number | null = id;
    while (current !== null && !visible.has(current)) {
      visible.add(current);
      current = byId.get(current)?.parentId ?? null;
    }
  }
  return visible;
}

function buildTree(menus: SidebarMenu[], visibleIds: Set<number>): MenuNode[] {
  const nodesById = new Map<number, MenuNode & { parentId: number | null; sortOrder: number }>();
  for (const m of menus) {
    if (!visibleIds.has(m.menuId)) continue;
    nodesById.set(m.menuId, {
      menuId: m.menuId,
      menuName: m.menuName,
      menuKey: m.menuKey,
      icon: resolveIcon(m.icon),
      path: MENU_ROUTES[m.menuKey] ?? null,
      parentId: m.parentId,
      sortOrder: m.sortOrder,
      children: [],
    });
  }

  const roots: (MenuNode & { sortOrder: number })[] = [];
  for (const node of nodesById.values()) {
    const parent = node.parentId !== null ? nodesById.get(node.parentId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }

  const bySort = (a: { sortOrder: number; menuId: number }, b: { sortOrder: number; menuId: number }) =>
    a.sortOrder - b.sortOrder || a.menuId - b.menuId;
  const sortTree = (nodes: (MenuNode & { sortOrder: number })[]) => {
    nodes.sort(bySort);
    nodes.forEach((n) => sortTree(n.children as (MenuNode & { sortOrder: number })[]));
  };
  sortTree(roots);

  return roots;
}

/**
 * The signed-in user's navigable menu tree, built from the same data Menu
 * Master / Role Menu Permission Assignment already manage — replaces the
 * hardcoded ADMIN_NAV/Dashboard/Administration markup previously baked
 * into AppShell.
 */
export function useSidebarMenus() {
  const { roleId } = useAuth();

  const menusQuery = useQuery<{ menus: SidebarMenu[] }>(MENUS, { fetchPolicy: "cache-and-network" });
  const roleAccessQuery = useQuery<{ roleAccess: RoleAccessRow[] }>(ROLE_ACCESS, {
    variables: { roleId },
    skip: roleId === null,
    fetchPolicy: "cache-and-network",
    pollInterval: ROLE_ACCESS_POLL_MS,
  });

  const menus = useMemo(() => menusQuery.data?.menus ?? [], [menusQuery.data]);
  const activeMenus = useMemo(() => menus.filter((m) => m.isActive), [menus]);
  const roleAccessRows = useMemo(() => roleAccessQuery.data?.roleAccess ?? [], [roleAccessQuery.data]);

  const accessibleMenuIds = useMemo(() => new Set(roleAccessRows.map((r) => r.menuId)), [roleAccessRows]);

  const tree = useMemo(() => {
    const visibleIds = computeVisibleIds(activeMenus, accessibleMenuIds);
    return buildTree(activeMenus, visibleIds);
  }, [activeMenus, accessibleMenuIds]);

  const menuKeyById = useMemo(() => new Map(activeMenus.map((m) => [m.menuId, m.menuKey])), [activeMenus]);

  // Only "loading" while there's nothing to show yet — a background
  // poll/refresh shouldn't flash the sidebar back to a skeleton.
  const loading =
    roleId !== null &&
    ((menusQuery.loading && menusQuery.data === undefined) ||
      (roleAccessQuery.loading && roleAccessQuery.data === undefined));

  return {
    tree,
    loading,

    /** Whether the signed-in role holds this specific menu (by menuKey) —
     * for guarding a single page's route (AC8). A menuKey with no matching
     * (active) menu row is treated as inaccessible. */
    isMenuKeyAccessible(menuKey: string): boolean {
      for (const [menuId, key] of menuKeyById) {
        if (key === menuKey) return accessibleMenuIds.has(menuId);
      }
      return false;
    },

    /** Whether the role has access to anything whose route falls under the
     * given path prefix (e.g. "/admin") — for gating an entire MFE's route
     * before its bundle is even loaded. */
    hasAccessibleUnder(pathPrefix: string): boolean {
      const hasAccessibleDescendant = (nodes: MenuNode[]): boolean =>
        nodes.some(
          (node) => (node.path !== null && node.path.startsWith(pathPrefix)) || hasAccessibleDescendant(node.children)
        );
      return hasAccessibleDescendant(tree);
    },
  };
}
