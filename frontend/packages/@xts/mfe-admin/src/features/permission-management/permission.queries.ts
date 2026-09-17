import { gql } from "@apollo/client";

const PERMISSION_FIELDS = gql`
  fragment PermissionFields on Permission {
    id
    permissionName
    isActive
    assignedRoleIds
  }
`;

// Real backend query: the backend's `permissions.typeDefs.ts` is still a
// stub — `type Permissions { id: Int! }` with a bare `permissionsList`
// query — so `id` is the only field that actually exists server-side today.
export const GET_PERMISSIONS = gql`
  query GetPermissions {
    permissionsList {
      id
    }
  }
`;

// NOTE: The backend has no create/update/delete mutations for permissions
// at all (permissions resolvers export an empty `Mutation: {}`) — these
// don't correspond to any real backend operation and are never sent (see
// usePermissionMutations.ts, which is wired to no-ops). Left here as dead
// code, using the full field set the UI will eventually need, for whenever
// the backend implements permission mutations.
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
