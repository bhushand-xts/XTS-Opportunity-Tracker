import { gql } from "@apollo/client";

const ROLE_FIELDS = gql`
  fragment RoleFields on Role {
    id
    roleName
    roleCode
    description
    isActive
    createdDt
    updatedDt
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
  mutation DeleteRole($id: Int!, $updatedBy: Int) {
    deleteRole(id: $id, updatedBy: $updatedBy)
  }
`;

export const GET_ROLE_HISTORY = gql`
  query GetRoleHistory($roleId: Int!) {
    roleHistory(roleId: $roleId) {
      trackerId
      roleId
      roleName
      roleCode
      description
      isActive
      createdDt
      createdBy
      updatedDt
      updatedBy
    }
  }
`;
