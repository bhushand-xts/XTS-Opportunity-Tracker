export default `
  # A sub-stage of a pipeline stage (mst_sub_stage) — the internal
  # approval-chain step within a gated stage, e.g. "Pending Approver Review".
  # Used by the Sub Stage Master admin screen.
  type SubStage {
    id: Int!
    stageId: Int!
    subStageName: String!
    isActive: Boolean!
    createdDt: String
    createdBy: Int
    updatedDt: String
    updatedBy: Int
    # Whether any opportunity currently sits at this sub-stage — if true,
    # it can't be edited (see sub-stages.service.ts).
    inUse: Boolean!
  }

  # One entry of a sub stage's change history (mst_sub_stage_tracker),
  # newest first.
  type SubStageHistory {
    trackerId: Int!
    subStageId: Int!
    stageId: Int!
    subStageName: String!
    isActive: Boolean!
    createdDt: String
    createdBy: Int
    updatedDt: String
    updatedBy: Int
  }

  input CreateSubStageInput {
    stageId: Int!
    subStageName: String!
    isActive: Boolean
    createdBy: Int
  }

  input UpdateSubStageInput {
    stageId: Int
    subStageName: String
    isActive: Boolean
    updatedBy: Int
  }

  extend type Query {
    subStagesList: [SubStage!]!
    subStage(id: Int!): SubStage
    subStageHistory(subStageId: Int!): [SubStageHistory!]!
  }

  extend type Mutation {
    createSubStage(input: CreateSubStageInput!): SubStage!
    updateSubStage(id: Int!, input: UpdateSubStageInput!): SubStage!
  }
`;
