import { gql } from "@apollo/client";

export const CREATE_DOCUMENT = gql`
  mutation CreateDocuments($input: CreateDocumentsInput!) {
    createDocuments(input: $input) {
      id
    }
  }
`;
