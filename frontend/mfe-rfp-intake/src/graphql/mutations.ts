import { gql } from "@apollo/client";

export const CREATE_RFP = gql`
  mutation CreateRfpIntake($input: CreateRfpIntakeInput!) {
    createRfpIntake(input: $input) {
      id
    }
  }
`;
