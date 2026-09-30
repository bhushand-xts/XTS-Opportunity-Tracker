import { gql } from "@apollo/client";

const REASON_CODE_FIELDS = gql`
  fragment ReasonCodeFields on ReasonCode {
    id
    reasonName
    description
    displayOrder
    isActive
    createdDt
    updatedDt
  }
`;

export const GET_REASON_CODES = gql`
  query GetReasonCodes {
    reasonCodesList {
      ...ReasonCodeFields
    }
  }
  ${REASON_CODE_FIELDS}
`;

export const CREATE_REASON_CODE = gql`
  mutation CreateReasonCode($input: CreateReasonCodeInput!) {
    createReasonCode(input: $input) {
      ...ReasonCodeFields
    }
  }
  ${REASON_CODE_FIELDS}
`;

export const UPDATE_REASON_CODE = gql`
  mutation UpdateReasonCode($id: Int!, $input: UpdateReasonCodeInput!) {
    updateReasonCode(id: $id, input: $input) {
      ...ReasonCodeFields
    }
  }
  ${REASON_CODE_FIELDS}
`;

export const DELETE_REASON_CODE = gql`
  mutation DeleteReasonCode($id: Int!, $updatedBy: Int) {
    deleteReasonCode(id: $id, updatedBy: $updatedBy)
  }
`;

export const GET_REASON_CODE_HISTORY = gql`
  query GetReasonCodeHistory($reasonCodeId: Int!) {
    reasonCodeHistory(reasonCodeId: $reasonCodeId) {
      trackerId
      reasonCodeId
      reasonName
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
