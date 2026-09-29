export const currencyTypeDefs = `#graphql

  type Currency {
    currencyId: Int!
    currencyName: String!
    currencyCode: String!
    currencySymbol: String!
    createdDt: String!
    createdBy: Int!
    updatedDt: String
    updatedBy: Int
    isActive: Boolean!
  }

  input CreateCurrencyInput {
    currencyName: String!
    currencyCode: String!
    currencySymbol: String!
    createdBy: Int
  }

  input UpdateCurrencyInput {
    currencyName: String
    currencyCode: String
    currencySymbol: String
    updatedBy: Int
  }

  extend type Query {
    currencies: [Currency!]!

    currency(currencyId: Int!): Currency
  }

  extend type Mutation {
    createCurrency(input: CreateCurrencyInput!): Currency!

    updateCurrency(
      currencyId: Int!
      input: UpdateCurrencyInput!
    ): Currency!

    toggleCurrencyStatus(
      currencyId: Int!
      isActive: Boolean!
      updatedBy: Int
    ): Currency!
  }
`;

export default currencyTypeDefs;