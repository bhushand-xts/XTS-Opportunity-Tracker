import { gql } from "@apollo/client";

export const DOCUMENTS_CORE_FIELDS = gql`
  fragment DocumentsCoreFields on Documents {
    id
  }
`;
