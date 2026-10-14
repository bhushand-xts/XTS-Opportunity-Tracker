import { gql } from "@apollo/client";

const INDUSTRY_FIELDS = gql`
  fragment IndustryFields on Industry {
    industryId
    industryName
    description
    createdDt
    createdBy
    updatedDt
    updatedBy
    isActive
  }
`;

export const GET_INDUSTRIES = gql`
  query GetIndustries {
    industries {
      ...IndustryFields
    }
  }
  ${INDUSTRY_FIELDS}
`;

export const CREATE_INDUSTRY = gql`
  mutation CreateIndustry($input: CreateIndustryInput!) {
    createIndustry(input: $input) {
      ...IndustryFields
    }
  }
  ${INDUSTRY_FIELDS}
`;

export const UPDATE_INDUSTRY = gql`
  mutation UpdateIndustry(
    $industryId: Int!
    $input: UpdateIndustryInput!
  ) {
    updateIndustry(industryId: $industryId, input: $input) {
      ...IndustryFields
    }
  }
  ${INDUSTRY_FIELDS}
`;

export const TOGGLE_INDUSTRY_STATUS = gql`
  mutation ToggleIndustryStatus(
    $industryId: Int!
    $isActive: Boolean!
    $updatedBy: Int
  ) {
    toggleIndustryStatus(
      industryId: $industryId
      isActive: $isActive
      updatedBy: $updatedBy
    ) {
      ...IndustryFields
    }
  }
  ${INDUSTRY_FIELDS}
`;
