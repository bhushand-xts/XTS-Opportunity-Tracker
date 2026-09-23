// Mirrors the admin service's `Permission` and menu-permission mapping types
// (backend/services/admin/src/graphql/typeDefs/permissions.typeDefs.ts).

export interface Permission {
  permissionId: number;
  permissionName: string;
  permissionKey: string;
  description: string | null;
  isActive: boolean;
  createdDt: string;
  createdBy: number;
  updatedDt: string | null;
  updatedBy: number | null;
}

export interface CreatePermissionInput {
  permissionName: string;
  permissionKey: string;
  description?: string | null;
  createdBy: number;
}

export interface UpdatePermissionInput {
  permissionName?: string;
  permissionKey?: string;
  description?: string | null;
  updatedBy: number;
}

/** One entry of a permission's change history (mst_permissions_tracker): the
 * permission as it stood after a change. Newest first. */
export interface PermissionHistory {
  trackerId: number;
  permissionId: number;
  permissionName: string;
  permissionKey: string;
  description: string | null;
  isActive: boolean;
  createdDt: string;
  createdBy: number | null;
  updatedDt: string | null;
  updatedBy: number | null;
}

/** One permission that is allowed on one menu (a row of tbl_menuwise_permission). */
export interface MenuPermissionMapping {
  id: number;
  menuId: number;
  permissionId: number;
  menuName: string;
  permissionName: string;
  permissionKey: string;
}
