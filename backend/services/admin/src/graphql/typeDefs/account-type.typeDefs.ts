export const accountTypeTypeDefs = `#graphql

  type AccountType {
    accountTypeId: Int!
    accountName: String!
    description: String
    createdDt: String!
    createdBy: Int!
    updatedDt: String
    updatedBy: Int
    isActive: Boolean!
  }

  input CreateAccountTypeInput {
    accountName: String!
    description: String
    isActive: Boolean
    createdBy: Int
  }

  input UpdateAccountTypeInput {
    accountName: String
    description: String
    isActive: Boolean
    updatedBy: Int
  }

  extend type Query {
    accountTypes: [AccountType!]!

    accountType(accountTypeId: Int!): AccountType
  }

  extend type Mutation {
    createAccountType(input: CreateAccountTypeInput!): AccountType!

    updateAccountType(
      accountTypeId: Int!
      input: UpdateAccountTypeInput!
    ): AccountType!

    toggleAccountTypeStatus(
      accountTypeId: Int!
      isActive: Boolean!
      updatedBy: Int
    ): AccountType!
  }
`;

export default accountTypeTypeDefs;
