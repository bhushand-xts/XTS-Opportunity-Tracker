import { gql } from "@apollo/client";

export const CREATE_OPPORTUNITY = gql`
  mutation CreateOpportunityPipeline($input: CreateOpportunityPipelineInput!) {
    createOpportunityPipeline(input: $input) {
      id
    }
  }
`;
