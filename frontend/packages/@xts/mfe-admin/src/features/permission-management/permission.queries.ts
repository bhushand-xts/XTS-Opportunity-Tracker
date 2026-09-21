import { gql } from "@apollo/client";

// Fields match the real backend's Permission type (permissions.typeDefs.ts)
// exactly. Only Permission Master's own basic CRUD is in scope here —
// MenuForPermissionMapping / menuPermissionMappings / saveMenuPermissions
// belong to the separate Role-Menu-Permission Assignment page.
const PERMISSION_FIELDS = gql`
  fragment PermissionFields on Permission {
    permissionId
    permissionName
    permissionKey
    description
    createdDt
    createdBy
    updatedDt
    updatedBy
    isActive
  }
`;

export const GET_PERMISSIONS = gql`
  query GetPermissions {
    permissions {
      ...PermissionFields
    }
  }
  ${PERMISSION_FIELDS}
`;

export const CREATE_PERMISSION = gql`
  mutation CreatePermission($input: CreatePermissionInput!) {
    createPermission(input: $input) {
      ...PermissionFields
    }
  }
  ${PERMISSION_FIELDS}
`;

export const UPDATE_PERMISSION = gql`
  mutation UpdatePermission($permissionId: Int!, $input: UpdatePermissionInput!) {
    updatePermission(permissionId: $permissionId, input: $input) {
      ...PermissionFields
    }
  }
  ${PERMISSION_FIELDS}
`;

// There is no delete mutation for permissions — only a soft toggle of isActive.
export const TOGGLE_PERMISSION_STATUS = gql`
  mutation TogglePermissionStatus($permissionId: Int!, $isActive: Boolean!, $updatedBy: Int!) {
    togglePermissionStatus(permissionId: $permissionId, isActive: $isActive, updatedBy: $updatedBy) {
      ...PermissionFields
    }
  }
  ${PERMISSION_FIELDS}
`;
