// Mirrors the admin service's `RoleMenuPermission` type
// (backend/services/admin/src/graphql/typeDefs/access.typeDefs.ts):
// one row means "this role holds this permission on this menu".

export interface RoleMenuPermission {
  id: number;
  roleId: number;
  menuId: number;
  permissionId: number;
  menuName: string;
  menuKey: string;
  permissionName: string;
  permissionKey: string;
}

export interface RoleMenuPermissionInput {
  roleId: number;
  menuId: number;
  permissionIds: number[];
  updatedBy: number;
}
