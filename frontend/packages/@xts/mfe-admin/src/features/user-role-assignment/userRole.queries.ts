import { gql } from "@apollo/client";

const USER_FIELDS = gql`
  fragment UserFields on User {
    id
    firstName
    lastName
    email
    roleId
    isActive
  }
`;

export const GET_USERS = gql`
  query GetUsers {
    userList {
      ...UserFields
    }
  }
  ${USER_FIELDS}
`;

// roleId null removes the user's role. Who made the change is taken from the login.
export const ASSIGN_USER_ROLE = gql`
  mutation AssignUserRole($userId: Int!, $roleId: Int, $updatedBy: Int) {
    assignUserRole(userId: $userId, roleId: $roleId, updatedBy: $updatedBy) {
      ...UserFields
    }
  }
  ${USER_FIELDS}
`;
