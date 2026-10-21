import { gql } from "@apollo/client";

const CURRENCY_FIELDS = gql`
  fragment CurrencyFields on Currency {
    currencyId
    currencyName
    currencyCode
    currencySymbol
    createdDt
    createdBy
    updatedDt
    updatedBy
    isActive
  }
`;

export const GET_CURRENCIES = gql`
  query GetCurrencies {
    currencies {
      ...CurrencyFields
    }
  }
  ${CURRENCY_FIELDS}
`;

export const CREATE_CURRENCY = gql`
  mutation CreateCurrency($input: CreateCurrencyInput!) {
    createCurrency(input: $input) {
      ...CurrencyFields
    }
  }
  ${CURRENCY_FIELDS}
`;

export const UPDATE_CURRENCY = gql`
  mutation UpdateCurrency(
    $currencyId: Int!
    $input: UpdateCurrencyInput!
  ) {
    updateCurrency(currencyId: $currencyId, input: $input) {
      ...CurrencyFields
    }
  }
  ${CURRENCY_FIELDS}
`;

export const TOGGLE_CURRENCY_STATUS = gql`
  mutation ToggleCurrencyStatus(
    $currencyId: Int!
    $isActive: Boolean!
    $updatedBy: Int
  ) {
    toggleCurrencyStatus(
      currencyId: $currencyId
      isActive: $isActive
      updatedBy: $updatedBy
    ) {
      ...CurrencyFields
    }
  }
  ${CURRENCY_FIELDS}
`;