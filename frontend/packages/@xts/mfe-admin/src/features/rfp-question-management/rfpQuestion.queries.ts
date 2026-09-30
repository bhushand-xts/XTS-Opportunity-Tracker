import { gql } from "@apollo/client";

const RFP_QUESTION_FIELDS = gql`
  fragment RfpQuestionFields on RfpQuestion {
    id
    question
    description
    displayOrder
    isActive
    createdDt
    updatedDt
  }
`;

export const GET_RFP_QUESTIONS = gql`
  query GetRfpQuestions {
    rfpQuestionsList {
      ...RfpQuestionFields
    }
  }
  ${RFP_QUESTION_FIELDS}
`;

export const CREATE_RFP_QUESTION = gql`
  mutation CreateRfpQuestion($input: CreateRfpQuestionInput!) {
    createRfpQuestion(input: $input) {
      ...RfpQuestionFields
    }
  }
  ${RFP_QUESTION_FIELDS}
`;

export const UPDATE_RFP_QUESTION = gql`
  mutation UpdateRfpQuestion($id: Int!, $input: UpdateRfpQuestionInput!) {
    updateRfpQuestion(id: $id, input: $input) {
      ...RfpQuestionFields
    }
  }
  ${RFP_QUESTION_FIELDS}
`;

export const GET_RFP_QUESTION_HISTORY = gql`
  query GetRfpQuestionHistory($questionId: Int!) {
    rfpQuestionHistory(questionId: $questionId) {
      trackerId
      questionId
      question
      description
      displayOrder
      isActive
      createdDt
      createdBy
      updatedDt
      updatedBy
    }
  }
`;
