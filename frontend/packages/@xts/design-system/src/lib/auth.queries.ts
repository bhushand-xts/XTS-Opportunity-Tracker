import { gql } from "@apollo/client";

// Only fields the real backend's User type currently defines (id, email,
// firstName, lastName) — it has no status/roles concept yet (mst_user has
// is_active: boolean and a single role_id, not this richer shape). See
// auth.ts's stateFromPayload for how profile.status/roles are synthesized
// instead of read from the response.
const AUTH_PAYLOAD_FIELDS = gql`
  fragment AuthPayloadFields on AuthPayload {
    token
    user {
      id
      email
      firstName
      lastName
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
