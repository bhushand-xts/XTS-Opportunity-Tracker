import { gql } from "@apollo/client";

// There is no real backend query for a role's menu+permission mapping.
// `role-menu.typeDefs.ts` and `role-permissions.typeDefs.ts` are two
// separate bare stubs (`type RoleMenu { id: Int! }` /
// `type RolePermissions { id: Int! }`), each with its own plain list query
// and no roleId-scoped or role/menu/permission-linking operation at all.
// This queries the closest real equivalents — the two id-only list stubs,
// combined — but the result is NOT actually scoped to a role, since the
// backend doesn't support that yet.
export const GET_ROLE_MENU_PERMISSIONS = gql`
  query GetRoleMenuPermissions {
    roleMenuList {
      id
    }
    rolePermissionsList {
      id
    }
  }
`;

// NOTE: The backend has no saveRoleMenuPermissions mutation (or any
// role/menu/permission linking mutation) at all — this doesn't correspond
// to any real backend operation and is never sent (see
// useSaveRoleMenuPermissions.ts, which is wired to a no-op). Left here as
// dead code for whenever the backend implements role-menu-permission
// assignment.
export const SAVE_ROLE_MENU_PERMISSIONS = gql`
  mutation SaveRoleMenuPermissions($roleId: ID!, $entries: [RoleMenuPermissionInput!]!) {
    saveRoleMenuPermissions(roleId: $roleId, entries: $entries) {
      roleId
      menuId
      canView
      canCreate
      canEdit
      canDelete
      canExport
    }
  }
`;
