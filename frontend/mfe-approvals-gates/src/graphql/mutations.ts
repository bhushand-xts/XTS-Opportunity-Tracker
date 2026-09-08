import { gql } from "@apollo/client";

export const CREATE_APPROVAL = gql`
  mutation CreateApprovalsGates($input: CreateApprovalsGatesInput!) {
    createApprovalsGates(input: $input) {
      id
    }
  }
`;
