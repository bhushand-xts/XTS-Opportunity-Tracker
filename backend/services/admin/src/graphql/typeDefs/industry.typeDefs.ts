export const industryTypeDefs = `#graphql

  type Industry {
    industryId: Int!
    industryName: String!
    description: String
    createdDt: String!
    createdBy: Int!
    updatedDt: String
    updatedBy: Int
    isActive: Boolean!
  }

  input CreateIndustryInput {
    industryName: String!
    description: String
    isActive: Boolean
    createdBy: Int
  }

  input UpdateIndustryInput {
    industryName: String
    description: String
    isActive: Boolean
    updatedBy: Int
  }

  extend type Query {
    industries: [Industry!]!

    industry(industryId: Int!): Industry
  }

  extend type Mutation {
    createIndustry(input: CreateIndustryInput!): Industry!

    updateIndustry(
      industryId: Int!
      input: UpdateIndustryInput!
    ): Industry!

    toggleIndustryStatus(
      industryId: Int!
      isActive: Boolean!
      updatedBy: Int
    ): Industry!
  }
`;

export default industryTypeDefs;
