export default `
  # An estimation phase (mst_estimation_phases) — a step of the estimation
  # process, e.g. "Discovery", "Design", "Build". Used by the Estimate Phase
  # Master admin screen.
  type EstimationPhase {
    id: Int!
    phaseName: String!
    phaseCode: String
    description: String
    displayOrder: Int
    isActive: Boolean!
    createdDt: String
    createdBy: Int
    updatedDt: String
    updatedBy: Int
  }

  # One entry of an estimation phase's change history
  # (tbl_estimation_phases_tracker), newest first.
  type EstimationPhaseHistory {
    trackerId: Int!
    phaseId: Int!
    phaseName: String!
    phaseCode: String
    description: String
    displayOrder: Int
    isActive: Boolean!
    createdDt: String
    createdBy: Int
    updatedDt: String
    updatedBy: Int
  }

  input CreateEstimationPhaseInput {
    phaseName: String!
    phaseCode: String
    description: String
    displayOrder: Int
    isActive: Boolean
    createdBy: Int
  }

  input UpdateEstimationPhaseInput {
    phaseName: String
    phaseCode: String
    description: String
    displayOrder: Int
    isActive: Boolean
    updatedBy: Int
  }

  extend type Query {
    estimationPhasesList: [EstimationPhase]
    estimationPhase(id: Int!): EstimationPhase
    estimationPhaseHistory(phaseId: Int!): [EstimationPhaseHistory!]!
  }

  extend type Mutation {
    createEstimationPhase(input: CreateEstimationPhaseInput!): EstimationPhase
    updateEstimationPhase(id: Int!, input: UpdateEstimationPhaseInput!): EstimationPhase
    deleteEstimationPhase(id: Int!, updatedBy: Int): Boolean
  }
`;
