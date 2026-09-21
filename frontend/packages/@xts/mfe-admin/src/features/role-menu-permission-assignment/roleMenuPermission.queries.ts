import { gql } from "@apollo/client";

// Fields match the real backend's RoleMenuPermission type
// (access.typeDefs.ts) exactly.
const ROLE_MENU_PERMISSION_FIELDS = gql`
  fragment RoleMenuPermissionFields on RoleMenuPermission {
    id
    roleId
    menuId
    permissionId
    menuName
    permissionName
    permissionKey
    createdDt
    createdBy
    updatedDt
    updatedBy
  }
`;

// The full catalog of permissions assignable to a given menu — used to
// render the checkbox list, independent of what's currently granted to any
// particular role.
export const GET_AVAILABLE_PERMISSIONS_FOR_MENU = gql`
  query GetAvailablePermissionsForMenu($menuId: Int!) {
    availablePermissionsForMenu(menuId: $menuId) {
      permissionId
      permissionName
      permissionKey
    }
  }
`;

// The permissions currently granted to a role for a specific menu — used to
// pre-check the boxes rendered from GET_AVAILABLE_PERMISSIONS_FOR_MENU.
export const GET_ROLE_MENU_PERMISSIONS = gql`
  query GetRoleMenuPermissions($roleId: Int!, $menuId: Int!) {
    roleMenuPermissions(roleId: $roleId, menuId: $menuId) {
      ...RoleMenuPermissionFields
    }
  }
  ${ROLE_MENU_PERMISSION_FIELDS}
`;

// Delta operation — permissionIds are the ones to ADD, not the full desired
// state. See useSaveRoleMenuPermissions.ts for the diff-and-save logic.
export const ADD_ROLE_MENU_PERMISSIONS = gql`
  mutation AddRoleMenuPermissions($input: RoleMenuPermissionInput!) {
    addRoleMenuPermissions(input: $input) {
      ...RoleMenuPermissionFields
    }
  }
  ${ROLE_MENU_PERMISSION_FIELDS}
`;

// Delta operation — permissionIds are the ones to REMOVE, not the full
// desired state. See useSaveRoleMenuPermissions.ts for the diff-and-save
// logic.
export const REMOVE_ROLE_MENU_PERMISSIONS = gql`
  mutation RemoveRoleMenuPermissions($input: RoleMenuPermissionInput!) {
    removeRoleMenuPermissions(input: $input) {
      ...RoleMenuPermissionFields
    }
  }
  ${ROLE_MENU_PERMISSION_FIELDS}
`;
