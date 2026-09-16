import { gql } from "@apollo/client";

const PERMISSION_FIELDS = gql`
  fragment PermissionFields on Permission {
    id
    permissionName
    isActive
    assignedRoleIds
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
  mutation CreatePermission($input: PermissionInput!) {
    createPermission(input: $input) {
      ...PermissionFields
    }
  }
  ${PERMISSION_FIELDS}
`;

export const UPDATE_PERMISSION = gql`
  mutation UpdatePermission($id: ID!, $input: PermissionInput!) {
    updatePermission(id: $id, input: $input) {
      ...PermissionFields
    }
  }
  ${PERMISSION_FIELDS}
`;

export const DELETE_PERMISSION = gql`
  mutation DeletePermission($id: ID!) {
    deletePermission(id: $id)
  }
`;
