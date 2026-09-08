import { gql } from "@apollo/client";

export const APPROVALSGATES_CORE_FIELDS = gql`
  fragment ApprovalsGatesCoreFields on ApprovalsGates {
    id
  }
`;
