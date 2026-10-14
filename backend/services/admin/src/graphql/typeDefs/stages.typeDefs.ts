export default `
  # A pipeline stage (mst_stage) — e.g. "Identified", "Qualifying (Go/No-Go)".
  # Used by the Stage Master admin screen.
  type Stage {
    id: Int!
    stageName: String!
    gate: String
    winPercentage: Float!
    displayOrder: Int
    isActive: Boolean!
    createdDt: String
    createdBy: Int
    updatedDt: String
    updatedBy: Int
    # Whether any opportunity currently sits at this stage — if true, the
    # stage can't be edited (see stages.service.ts).
    inUse: Boolean!
  }

  # One entry of a stage's change history (mst_stage_tracker), newest first.
  type StageHistory {
    trackerId: Int!
    stageId: Int!
    stageName: String!
    gate: String
    winPercentage: Float!
    displayOrder: Int
    isActive: Boolean!
    createdDt: String
    createdBy: Int
    updatedDt: String
    updatedBy: Int
  }

  input CreateStageInput {
    stageName: String!
    gate: String
    winPercentage: Float!
    displayOrder: Int!
    isActive: Boolean
    createdBy: Int
  }

  input UpdateStageInput {
    stageName: String
    gate: String
    winPercentage: Float
    displayOrder: Int
    isActive: Boolean
    updatedBy: Int
  }

  extend type Query {
    stagesList: [Stage!]!
    stage(id: Int!): Stage
    stageHistory(stageId: Int!): [StageHistory!]!
  }

  extend type Mutation {
    createStage(input: CreateStageInput!): Stage!
    updateStage(id: Int!, input: UpdateStageInput!): Stage!
  }
`;
