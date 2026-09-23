import { gql } from "@apollo/client";

// Only fields the real backend's User type currently defines (id, email,
// firstName, lastName, roleId) — it has no status concept yet (mst_user has
// is_active: boolean, not this richer shape). See auth.ts's stateFromPayload
// for how profile.status is synthesized instead of read from the response.
// roleId identifies a row in the admin service's mst_roles — resolved to a
// display name separately via ROLE_NAME, since it lives in another subgraph.
const AUTH_PAYLOAD_FIELDS = gql`
  fragment AuthPayloadFields on AuthPayload {
    token
    user {
      id
      email
      firstName
      lastName
      roleId
    }
  }
`;

export const LOGIN = gql`
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      ...AuthPayloadFields
    }
  }
  ${AUTH_PAYLOAD_FIELDS}
`;

export const REGISTER = gql`
  mutation Register($firstName: String!, $lastName: String!, $email: String!, $password: String!) {
    register(firstName: $firstName, lastName: $lastName, email: $email, password: $password) {
      ...AuthPayloadFields
    }
  }
  ${AUTH_PAYLOAD_FIELDS}
`;

// The signed-in user's role name, resolved from the admin service by roleId.
export const ROLE_NAME = gql`
  query RoleName($id: Int!) {
    role(id: $id) {
      roleName
    }
  }
`;

// Every (menu, permission) grant the signed-in user's role holds — the real
// data behind hasPermission()/hasMenuAccess() in auth.ts. menuKey/permissionKey
// (not the numeric ids) are what the app keys its checks on, since those stay
// stable across environments while ids don't (see mst_menus.menu_key,
// mst_permissions.permission_key).
export const ROLE_ACCESS = gql`
  query RoleAccessForAuth($roleId: Int!) {
    roleAccess(roleId: $roleId) {
      menuKey
      permissionKey
    }
  }
`;
