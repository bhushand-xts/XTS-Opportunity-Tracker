/**
 * `mst_menu.menu_key` is a flat, globally-unique identifier (see Menu
 * Master's validation — lowercase letters/numbers/hyphens/underscores, no
 * slashes), not a URL path, and the backend has no concept of client-side
 * routes. This registry is the one place that maps a menu to the page it
 * actually opens; add an entry here whenever a new page gets a route.
 *
 * A `menuKey` with no entry here still renders in the sidebar (so it isn't
 * silently hidden), just as a disabled row rather than a dead link — this
 * is expected for menus whose MFE is still a stub.
 */
export const MENU_ROUTES: Record<string, string> = {
  dashboard: "/dashboard",
  menu_master: "/admin/menu-management/menu-master",
  permission_master: "/admin/menu-management/permission-master",
  menu_permission_mapping: "/admin/menu-management/menu-permission-mapping",
  role_master: "/admin/user-management/role-master",
  role_menu_permission_assignment: "/admin/user-management/role-menu-permission-assignment",
  user_role_assignment: "/admin/user-management/user-role-assignment",
};
