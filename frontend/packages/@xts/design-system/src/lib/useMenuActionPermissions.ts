import { useMemo } from "react";
import { useQuery } from "@apollo/client";
import { useAuth } from "./auth";
import { USER_MENU_PERMISSIONS_BY_MENU } from "./menu.queries";
import { useSidebarMenus, type MenuNode } from "./useSidebarMenus";

interface PermissionRow {
  permissionKey: string;
}

function findMenuId(nodes: MenuNode[], menuKey: string): number | null {
  for (const node of nodes) {
    if (node.menuKey === menuKey) return node.menuId;
    const found = findMenuId(node.children, menuKey);
    if (found !== null) return found;
  }
  return null;
}

/**
 * Which specific actions (view/edit/delete/add/...) the signed-in user
 * holds on one menu — the layer below useSidebarMenus(): that hook answers
 * "can I see this page at all," this answers "which of its buttons should
 * actually work." A menu granted only "view" should render its Add/Edit
 * controls as unavailable, not just its own visibility in the sidebar.
 *
 * This is a UI-level control only, same caveat as the sidebar's own route
 * guards — it doesn't stop the underlying mutation from being called
 * directly, since the backend doesn't check permissions yet either.
 */
export function useMenuActionPermissions(menuKey: string) {
  const { session } = useAuth();
  const { tree, loading: menusLoading } = useSidebarMenus();
  const menuId = useMemo(() => findMenuId(tree, menuKey), [tree, menuKey]);

  const { data, loading: permsLoading } = useQuery<{ userMenuPermissionsByMenu: PermissionRow[] }>(
    USER_MENU_PERMISSIONS_BY_MENU,
    {
      variables: { menuId },
      skip: session === null || menuId === null,
      fetchPolicy: "cache-and-network",
    }
  );

  const permissionKeys = useMemo(
    () => new Set((data?.userMenuPermissionsByMenu ?? []).map((p) => p.permissionKey)),
    [data]
  );

  return {
    loading: menusLoading || (menuId !== null && permsLoading && data === undefined),
    can(permissionKey: string): boolean {
      return permissionKeys.has(permissionKey);
    },
  };
}
