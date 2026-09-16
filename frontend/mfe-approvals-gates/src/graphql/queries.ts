import { gql } from "@apollo/client";

// Query only this module's own subgraph types -- cross-domain data (e.g.
// something Approvals & Gates needs from Opportunity & Pipeline) comes
// through federation entity extension on the backend, not a second
// subgraph queried from here.
export const GET_APPROVAL_LIST = gql`
  query GetApprovalsGatesList {
    approvalsGatesList {
      id
    }
  }
`;
