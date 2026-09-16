import { gql } from "@apollo/client";

const ROLE_FIELDS = gql`
  fragment RoleFields on Role {
    id
    roleName
    roleCode
    isActive
    assignedUserIds
  }
`;

export const GET_ROLES = gql`
  query GetRoles {
    roles {
      ...RoleFields
    }
  }
  ${ROLE_FIELDS}
`;

export const CREATE_ROLE = gql`
  mutation CreateRole($input: RoleInput!) {
    createRole(input: $input) {
      ...RoleFields
    }
  }
  ${ROLE_FIELDS}
`;

export const UPDATE_ROLE = gql`
  mutation UpdateRole($id: ID!, $input: RoleInput!) {
    updateRole(id: $id, input: $input) {
      ...RoleFields
    }
  }
  ${ROLE_FIELDS}
`;

export const DELETE_ROLE = gql`
  mutation DeleteRole($id: ID!) {
    deleteRole(id: $id)
  }
`;
