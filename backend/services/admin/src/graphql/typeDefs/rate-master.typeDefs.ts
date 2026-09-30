export const rateMasterTypeDefs = `#graphql

  type RateMaster {
    ratemasterId: Int!
    roleName: String!
    roleCode: String!
    currencyId: Int!
    rateType: String!
    defaultRate: Float!
    location: String
    description: String
    createdDt: String!
    createdBy: Int!
    updatedDt: String
    updatedBy: Int
    isActive: Boolean!
  }

  input CreateRateMasterInput {
    roleName: String!
    roleCode: String!
    currencyId: Int!
    rateType: String!
    defaultRate: Float!
    location: String
    description: String
    createdBy: Int
  }

  input UpdateRateMasterInput {
    roleName: String!
    roleCode: String!
    currencyId: Int!
    rateType: String!
    defaultRate: Float!
    location: String
    description: String
    updatedBy: Int
  }

  extend type Query {

    rateMasters: [RateMaster!]!

    rateMaster(
      ratemasterId: Int!
    ): RateMaster

  }

  extend type Mutation {

    createRateMaster(
      input: CreateRateMasterInput!
    ): RateMaster!

    updateRateMaster(
      ratemasterId: Int!
      input: UpdateRateMasterInput!
    ): RateMaster!

    toggleRateMasterStatus(
      ratemasterId: Int!
      isActive: Boolean!
      updatedBy: Int
    ): RateMaster!

  }
`;

export default rateMasterTypeDefs;