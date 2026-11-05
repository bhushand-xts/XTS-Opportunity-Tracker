export default `
  # A standard question asked of vendors during the RFP process
  # (mst_rfp_questions). Used by the Generic RFP Question Master admin screen.
  type RfpQuestion {
    id: Int!
    question: String!
    description: String
    displayOrder: Int
    isActive: Boolean!
    createdDt: String
    createdBy: Int
    updatedDt: String
    updatedBy: Int
  }

  # One entry of an RFP question's change history (mst_rfp_questions_tracker), newest first.
  type RfpQuestionHistory {
    trackerId: Int!
    questionId: Int!
    question: String!
    description: String
    displayOrder: Int
    isActive: Boolean!
    createdDt: String
    createdBy: Int
    updatedDt: String
    updatedBy: Int
  }

  input CreateRfpQuestionInput {
    question: String!
    description: String
    displayOrder: Int
    isActive: Boolean
    createdBy: Int
  }

  input UpdateRfpQuestionInput {
    question: String
    description: String
    displayOrder: Int
    isActive: Boolean
    updatedBy: Int
  }

  extend type Query {
    rfpQuestionsList: [RfpQuestion]
    rfpQuestion(id: Int!): RfpQuestion
    rfpQuestionHistory(questionId: Int!): [RfpQuestionHistory!]!
  }

  extend type Mutation {
    createRfpQuestion(input: CreateRfpQuestionInput!): RfpQuestion
    updateRfpQuestion(id: Int!, input: UpdateRfpQuestionInput!): RfpQuestion
  }
`;
