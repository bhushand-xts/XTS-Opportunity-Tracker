import { gql } from "@apollo/client";

export const OPPORTUNITYPIPELINE_CORE_FIELDS = gql`
  fragment OpportunityPipelineCoreFields on OpportunityPipeline {
    id
  }
`;
