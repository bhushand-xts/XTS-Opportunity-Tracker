import { useMemo } from "react";
import { useQuery } from "@apollo/client";
import type { LucideIcon } from "lucide-react";
import { useAuth } from "./auth";
import { MY_SIDEBAR } from "./menu.queries";
import { resolveIcon } from "./menuIcons";
import { MENU_ROUTES } from "./menuRoutes";

// A short poll, not a push mechanism — cheap way to satisfy "the sidebar
// reflects updated access" (AC9) without new backend infrastructure. Also
// refetches for free whenever Apollo's normal cache-and-network kicks in
// (e.g. remount after navigating back into the app shell). mySidebar is
// keyed off the signed-in user's identity (their auth token), not a roleId
// we cache client-side — so unlike the old roleId-keyed query, this poll
// also picks up a role *reassignment*, not just a grant change on the same
// role, without needing a fresh login.
const MY_SIDEBAR_POLL_MS = 2 * 60 * 1000;

interface SidebarMenuRow {
  menuId: number;
  menuName: string;
  menuKey: string;
  icon: string | null;
  children: SidebarMenuRow[];
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

// The backend already resolves the role, prunes to what it holds (plus
// structural ancestors), and nests the tree — this just maps that shape
// into what the sidebar renders (icon component + route), in the order the
// server already sorted it.
function toMenuNode(row: SidebarMenuRow): MenuNode {
  return {
    menuId: row.menuId,
    menuName: row.menuName,
    menuKey: row.menuKey,
    icon: resolveIcon(row.icon),
    path: MENU_ROUTES[row.menuKey] ?? null,
    children: row.children.map(toMenuNode),
  };
}

function findByMenuKey(nodes: MenuNode[], menuKey: string): boolean {
  return nodes.some((node) => node.menuKey === menuKey || findByMenuKey(node.children, menuKey));
}

function findUnderPath(nodes: MenuNode[], pathPrefix: string): boolean {
  return nodes.some(
    (node) => (node.path !== null && node.path.startsWith(pathPrefix)) || findUnderPath(node.children, pathPrefix)
  );
}

/**
 * The signed-in user's navigable menu tree, built from the same data Menu
 * Master / Role Menu Permission Assignment already manage — replaces the
 * hardcoded ADMIN_NAV/Dashboard/Administration markup previously baked
 * into AppShell.
 */
export function useSidebarMenus() {
  const { session } = useAuth();

  // No session, no token, no point asking — mySidebar would just reject it.
  const { data, loading: queryLoading, error } = useQuery<{ mySidebar: SidebarMenuRow[] }>(MY_SIDEBAR, {
    skip: session === null,
    fetchPolicy: "cache-and-network",
    pollInterval: MY_SIDEBAR_POLL_MS,
  });

  const tree = useMemo(() => (data?.mySidebar ?? []).map(toMenuNode), [data]);

  // Only "loading" while there's nothing to show yet — a background
  // poll/refresh shouldn't flash the sidebar back to a skeleton. A query
  // error (e.g. a stale/invalid token) is treated the same as "no access"
  // rather than left to throw and break the shell.
  const loading = session !== null && data === undefined && !error && queryLoading;

  return {
    tree,
    loading,

    /** Whether the signed-in user's sidebar includes this specific menu (by
     * menuKey) — for guarding a single page's route (AC8). A leaf page's
     * menuKey only ever appears here if it was actually granted (a leaf has
     * no descendant to pull it in as a structural ancestor), so this is
     * equivalent to "was this exact menu granted," not just "does it show
     * up somewhere." */
    isMenuKeyAccessible(menuKey: string): boolean {
      return findByMenuKey(tree, menuKey);
    },

    /** Whether the user's sidebar has anything whose route falls under the
     * given path prefix (e.g. "/admin") — for gating an entire MFE's route
     * before its bundle is even loaded. */
    hasAccessibleUnder(pathPrefix: string): boolean {
      return findUnderPath(tree, pathPrefix);
    },
  };
}
