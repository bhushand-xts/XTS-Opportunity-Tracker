import { gql } from "@apollo/client";

const RATE_MASTER_FIELDS = gql`
  fragment RateMasterFields on RateMaster {
    ratemasterId
    roleName
    roleCode
    currencyId
    rateType
    defaultRate
    location
    description
    createdDt
    createdBy
    updatedDt
    updatedBy
    isActive
  }
`;

export const GET_RATE_MASTERS = gql`
  query GetRateMasters {
    rateMasters {
      ...RateMasterFields
    }
  }
  ${RATE_MASTER_FIELDS}
`;

export const CREATE_RATE_MASTER = gql`
  mutation CreateRateMaster($input: CreateRateMasterInput!) {
    createRateMaster(input: $input) {
      ...RateMasterFields
    }
  }
  ${RATE_MASTER_FIELDS}
`;

export const UPDATE_RATE_MASTER = gql`
  mutation UpdateRateMaster(
    $ratemasterId: Int!
    $input: UpdateRateMasterInput!
  ) {
    updateRateMaster(
      ratemasterId: $ratemasterId
      input: $input
    ) {
      ...RateMasterFields
    }
  }
  ${RATE_MASTER_FIELDS}
`;

export const TOGGLE_RATE_MASTER_STATUS = gql`
  mutation ToggleRateMasterStatus(
    $ratemasterId: Int!
    $isActive: Boolean!
    $updatedBy: Int
  ) {
    toggleRateMasterStatus(
      ratemasterId: $ratemasterId
      isActive: $isActive
      updatedBy: $updatedBy
    ) {
      ...RateMasterFields
    }
  }
  ${RATE_MASTER_FIELDS}
`;