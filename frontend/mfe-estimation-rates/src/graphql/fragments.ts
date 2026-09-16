import { gql } from "@apollo/client";

export const ESTIMATIONRATES_CORE_FIELDS = gql`
  fragment EstimationRatesCoreFields on EstimationRates {
    id
  }
`;
