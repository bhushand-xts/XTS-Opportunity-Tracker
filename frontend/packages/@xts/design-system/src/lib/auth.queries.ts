import { gql } from "@apollo/client";

const AUTH_PAYLOAD_FIELDS = gql`
  fragment AuthPayloadFields on AuthPayload {
    token
    user {
      id
      email
      firstName
      lastName
      status
      roles
    }
  }
`;

export const LOGIN = gql`
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      ...AuthPayloadFields
    }
  }
  ${AUTH_PAYLOAD_FIELDS}
`;

export const REGISTER_USER = gql`
  mutation RegisterUser($input: RegisterInput!) {
    registerUser(input: $input) {
      ...AuthPayloadFields
    }
  }
  ${AUTH_PAYLOAD_FIELDS}
`;
