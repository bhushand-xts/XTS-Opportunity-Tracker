import { gql } from "@apollo/client";

const ROLE_MENU_PERMISSION_FIELDS = gql`
  fragment RoleMenuPermissionFields on RoleMenuPermission {
    roleId
    menuId
    canView
    canCreate
    canEdit
    canDelete
    canExport
  }
`;

export const GET_ROLE_MENU_PERMISSIONS = gql`
  query GetRoleMenuPermissions($roleId: ID!) {
    roleMenuPermissions(roleId: $roleId) {
      ...RoleMenuPermissionFields
    }
  }
  ${ROLE_MENU_PERMISSION_FIELDS}
`;

export const SAVE_ROLE_MENU_PERMISSIONS = gql`
  mutation SaveRoleMenuPermissions($roleId: ID!, $entries: [RoleMenuPermissionInput!]!) {
    saveRoleMenuPermissions(roleId: $roleId, entries: $entries) {
      ...RoleMenuPermissionFields
    }
  }
  ${ROLE_MENU_PERMISSION_FIELDS}
`;
