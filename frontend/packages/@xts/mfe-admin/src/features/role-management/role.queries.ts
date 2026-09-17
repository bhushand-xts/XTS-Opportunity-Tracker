import { gql } from "@apollo/client";

// Fields match the real backend's Role type (roles.typeDefs.ts) exactly.
// assignedUserIds is deliberately NOT queried here — the backend doesn't
// define it yet (it's "populated by User Role Assignment once it exists",
// per api-contracts/src/role.ts); it stays undefined on the real backend
// path, which is fine since no UI currently reads it.
const ROLE_FIELDS = gql`
  fragment RoleFields on Role {
    id
    roleName
    roleCode
    isActive
  }
`;

export const GET_ROLES = gql`
  query GetRoles {
    rolesList {
      ...RoleFields
    }
  }
  ${ROLE_FIELDS}
`;

export const CREATE_ROLE = gql`
  mutation CreateRole($input: CreateRoleInput!) {
    createRole(input: $input) {
      ...RoleFields
    }
  }
  ${ROLE_FIELDS}
`;

export const UPDATE_ROLE = gql`
  mutation UpdateRole($id: Int!, $input: UpdateRoleInput!) {
    updateRole(id: $id, input: $input) {
      ...RoleFields
    }
  }
  ${ROLE_FIELDS}
`;

export const DELETE_ROLE = gql`
  mutation DeleteRole($id: Int!) {
    deleteRole(id: $id)
  }
`;
