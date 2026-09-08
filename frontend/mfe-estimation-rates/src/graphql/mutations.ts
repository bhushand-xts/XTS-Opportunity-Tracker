import { gql } from "@apollo/client";

export const CREATE_ESTIMATION = gql`
  mutation CreateEstimationRates($input: CreateEstimationRatesInput!) {
    createEstimationRates(input: $input) {
      id
    }
  }
`;
