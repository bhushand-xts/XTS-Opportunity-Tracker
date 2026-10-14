import { gql } from "@apollo/client";

const SUB_STAGE_FIELDS = gql`
  fragment SubStageFields on SubStage {
    id
    stageId
    subStageName
    isActive
    createdDt
    updatedDt
    inUse
  }
`;

export const GET_SUB_STAGES = gql`
  query GetSubStages {
    subStagesList {
      ...SubStageFields
    }
  }
  ${SUB_STAGE_FIELDS}
`;

export const CREATE_SUB_STAGE = gql`
  mutation CreateSubStage($input: CreateSubStageInput!) {
    createSubStage(input: $input) {
      ...SubStageFields
    }
  }
  ${SUB_STAGE_FIELDS}
`;

export const UPDATE_SUB_STAGE = gql`
  mutation UpdateSubStage($id: Int!, $input: UpdateSubStageInput!) {
    updateSubStage(id: $id, input: $input) {
      ...SubStageFields
    }
  }
  ${SUB_STAGE_FIELDS}
`;

export const GET_SUB_STAGE_HISTORY = gql`
  query GetSubStageHistory($subStageId: Int!) {
    subStageHistory(subStageId: $subStageId) {
      trackerId
      subStageId
      stageId
      subStageName
      isActive
      createdDt
      createdBy
      updatedDt
      updatedBy
    }
  }
`;
