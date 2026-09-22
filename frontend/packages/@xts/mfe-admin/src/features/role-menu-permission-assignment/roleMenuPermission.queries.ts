import { gql } from "@apollo/client";

/** Everything one role is allowed to do: one row per (menu, permission). */
export const GET_ROLE_ACCESS = gql`
  query GetRoleAccess($roleId: Int!) {
    roleAccess(roleId: $roleId) {
      id
      roleId
      menuId
      permissionId
    }
  }
`;

export const ADD_ROLE_MENU_PERMISSIONS = gql`
  mutation AddRoleMenuPermissions($input: RoleMenuPermissionInput!) {
    addRoleMenuPermissions(input: $input) {
      id
    }
  }
`;

export const REMOVE_ROLE_MENU_PERMISSIONS = gql`
  mutation RemoveRoleMenuPermissions($input: RoleMenuPermissionInput!) {
    removeRoleMenuPermissions(input: $input) {
      id
    }
  }
`;
