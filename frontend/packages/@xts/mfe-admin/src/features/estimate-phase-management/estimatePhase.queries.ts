import { gql } from "@apollo/client";

const ESTIMATION_PHASE_FIELDS = gql`
  fragment EstimationPhaseFields on EstimationPhase {
    id
    phaseName
    phaseCode
    description
    displayOrder
    isActive
    createdDt
    updatedDt
  }
`;

export const GET_ESTIMATION_PHASES = gql`
  query GetEstimationPhases {
    estimationPhasesList {
      ...EstimationPhaseFields
    }
  }
  ${ESTIMATION_PHASE_FIELDS}
`;

export const CREATE_ESTIMATION_PHASE = gql`
  mutation CreateEstimationPhase($input: CreateEstimationPhaseInput!) {
    createEstimationPhase(input: $input) {
      ...EstimationPhaseFields
    }
  }
  ${ESTIMATION_PHASE_FIELDS}
`;

export const UPDATE_ESTIMATION_PHASE = gql`
  mutation UpdateEstimationPhase($id: Int!, $input: UpdateEstimationPhaseInput!) {
    updateEstimationPhase(id: $id, input: $input) {
      ...EstimationPhaseFields
    }
  }
  ${ESTIMATION_PHASE_FIELDS}
`;

export const DELETE_ESTIMATION_PHASE = gql`
  mutation DeleteEstimationPhase($id: Int!, $updatedBy: Int) {
    deleteEstimationPhase(id: $id, updatedBy: $updatedBy)
  }
`;

export const GET_ESTIMATION_PHASE_HISTORY = gql`
  query GetEstimationPhaseHistory($phaseId: Int!) {
    estimationPhaseHistory(phaseId: $phaseId) {
      trackerId
      phaseId
      phaseName
      phaseCode
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
