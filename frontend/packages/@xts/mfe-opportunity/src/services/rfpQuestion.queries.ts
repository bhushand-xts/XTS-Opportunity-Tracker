import { gql } from '@apollo/client';

/** Existing admin master read; selecting a template never changes the master. */
export const GET_RFP_QUESTION_TEMPLATES = gql`
  query OpportunityRfpQuestionTemplates {
    rfpQuestionsList {
      id
      question
      description
      displayOrder
      isActive
      createdDt
      updatedDt
    }
  }
`;
