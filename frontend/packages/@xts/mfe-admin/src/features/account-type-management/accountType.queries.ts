import { gql } from "@apollo/client";

const ACCOUNT_TYPE_FIELDS = gql`
  fragment AccountTypeFields on AccountType {
    accountTypeId
    accountName
    description
    createdDt
    createdBy
    updatedDt
    updatedBy
    isActive
  }
`;

export const GET_ACCOUNT_TYPES = gql`
  query GetAccountTypes {
    accountTypes {
      ...AccountTypeFields
    }
  }
  ${ACCOUNT_TYPE_FIELDS}
`;

export const CREATE_ACCOUNT_TYPE = gql`
  mutation CreateAccountType($input: CreateAccountTypeInput!) {
    createAccountType(input: $input) {
      ...AccountTypeFields
    }
  }
  ${ACCOUNT_TYPE_FIELDS}
`;

export const UPDATE_ACCOUNT_TYPE = gql`
  mutation UpdateAccountType(
    $accountTypeId: Int!
    $input: UpdateAccountTypeInput!
  ) {
    updateAccountType(accountTypeId: $accountTypeId, input: $input) {
      ...AccountTypeFields
    }
  }
  ${ACCOUNT_TYPE_FIELDS}
`;

export const TOGGLE_ACCOUNT_TYPE_STATUS = gql`
  mutation ToggleAccountTypeStatus(
    $accountTypeId: Int!
    $isActive: Boolean!
    $updatedBy: Int
  ) {
    toggleAccountTypeStatus(
      accountTypeId: $accountTypeId
      isActive: $isActive
      updatedBy: $updatedBy
    ) {
      ...AccountTypeFields
    }
  }
  ${ACCOUNT_TYPE_FIELDS}
`;
