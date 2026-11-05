import { gql } from "@apollo/client";

const PERMISSION_FIELDS = gql`
  fragment PermissionFields on Permission {
    permissionId
    permissionName
    permissionKey
    description
    isActive
    createdDt
    createdBy
    updatedDt
    updatedBy
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

export const TOGGLE_PERMISSION_STATUS = gql`
  mutation TogglePermissionStatus($permissionId: Int!, $isActive: Boolean!, $updatedBy: Int!) {
    togglePermissionStatus(permissionId: $permissionId, isActive: $isActive, updatedBy: $updatedBy) {
      ...PermissionFields
    }
  }
  ${PERMISSION_FIELDS}
`;

export const GET_PERMISSION_HISTORY = gql`
  query GetPermissionHistory($permissionId: Int!) {
    permissionHistory(permissionId: $permissionId) {
      trackerId
      permissionId
      permissionName
      permissionKey
      description
      isActive
      createdDt
      createdBy
      updatedDt
      updatedBy
    }
  }
`;
