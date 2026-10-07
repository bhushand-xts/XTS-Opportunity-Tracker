import { gql } from "@apollo/client";

// roleId is already in the backend's User GraphQL type, but the login/
// register resolvers don't populate it yet (see auth.service.ts) — it comes
// back null until that's fixed, which is fine: stateFromPayload stores
// whatever it gets, and the menu-access hook (lib/access.ts) already treats
// a null roleId as "no access", so this is a safe no-op until then. See
// auth.ts's stateFromPayload for how profile.status is synthesized instead
// of read from the response (no status concept exists on User yet).
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
