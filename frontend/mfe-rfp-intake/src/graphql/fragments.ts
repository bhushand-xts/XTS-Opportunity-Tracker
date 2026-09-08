import { gql } from "@apollo/client";

export const RFPINTAKE_CORE_FIELDS = gql`
  fragment RfpIntakeCoreFields on RfpIntake {
    id
  }
`;
