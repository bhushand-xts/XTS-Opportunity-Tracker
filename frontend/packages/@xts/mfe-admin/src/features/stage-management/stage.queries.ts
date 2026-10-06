import { gql } from "@apollo/client";

const STAGE_FIELDS = gql`
  fragment StageFields on Stage {
    id
    stageName
    gate
    winPercentage
    displayOrder
    isActive
    createdDt
    updatedDt
    inUse
  }
`;

export const GET_STAGES = gql`
  query GetStages {
    stagesList {
      ...StageFields
    }
  }
  ${STAGE_FIELDS}
`;

export const CREATE_STAGE = gql`
  mutation CreateStage($input: CreateStageInput!) {
    createStage(input: $input) {
      ...StageFields
    }
  }
  ${STAGE_FIELDS}
`;

export const UPDATE_STAGE = gql`
  mutation UpdateStage($id: Int!, $input: UpdateStageInput!) {
    updateStage(id: $id, input: $input) {
      ...StageFields
    }
  }
  ${STAGE_FIELDS}
`;

export const GET_STAGE_HISTORY = gql`
  query GetStageHistory($stageId: Int!) {
    stageHistory(stageId: $stageId) {
      trackerId
      stageId
      stageName
      gate
      winPercentage
      displayOrder
      isActive
      createdDt
      createdBy
      updatedDt
      updatedBy
    }
  }
`;
