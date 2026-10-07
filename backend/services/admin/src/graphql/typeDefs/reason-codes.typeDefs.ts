export default `
  # A reason code (tbl_reason_codes) — a configurable reason used elsewhere in
  # the app (e.g. rejection/hold reasons). Used by the Reason Code Master
  # admin screen.
  type ReasonCode {
    id: Int!
    reasonName: String!
    description: String
    displayOrder: Int
    isActive: Boolean!
    createdDt: String
    createdBy: Int
    updatedDt: String
    updatedBy: Int
  }

  # One entry of a reason code's change history (tbl_reason_codes_tracker),
  # newest first.
  type ReasonCodeHistory {
    trackerId: Int!
    reasonCodeId: Int!
    reasonName: String!
    description: String
    displayOrder: Int
    isActive: Boolean!
    createdDt: String
    createdBy: Int
    updatedDt: String
    updatedBy: Int
  }

  input CreateReasonCodeInput {
    reasonName: String!
    description: String
    displayOrder: Int
    isActive: Boolean
    createdBy: Int
  }

  input UpdateReasonCodeInput {
    reasonName: String
    description: String
    displayOrder: Int
    isActive: Boolean
    updatedBy: Int
  }

  extend type Query {
    reasonCodesList: [ReasonCode]
    reasonCode(id: Int!): ReasonCode
    reasonCodeHistory(reasonCodeId: Int!): [ReasonCodeHistory!]!
  }

  extend type Mutation {
    createReasonCode(input: CreateReasonCodeInput!): ReasonCode
    updateReasonCode(id: Int!, input: UpdateReasonCodeInput!): ReasonCode
    deleteReasonCode(id: Int!, updatedBy: Int): Boolean
  }
`;
