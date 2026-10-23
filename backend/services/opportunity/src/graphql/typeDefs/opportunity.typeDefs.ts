export const opportunityTypeDefs = `#graphql

  type Opportunity {
    estimation: OpportunityEstimation
    stageHistory: [OpportunityStageHistory!]!
    allowedActions: [String!]!
    opportunityId: Int!
    opportunityNumber: String
    opportunityName: String

    opportunityTypeId: Int
    sourceTypeId: Int
    clientId: Int
    stageId: Int
    subStageId: Int
    ownerId: Int
    assignedTo: Int

    priority: String
    serviceLine: String

    solicitationNumber: String
    issuingAgency: String
    procurementContact: String
    queDueDate: String
    submissionMethod: String
    contractTerm: String
    incumbentVendor: String
    preBidMeeting: Int

    documentType: String
    fileName: String
    filePath: String
    uploadedBy: Int
    uploadedDt: String
    docSubmissionFormat: String
    evaluationBasis: String

    opportunityDescription: String

    leadReceivedDate: String
    expectedStartDate: String
    expectedCloseDate: String
    proposalDueDate: String

    createdDt: String!
    createdBy: Int
    updatedDt: String
    updatedBy: Int
    isActive: Boolean!

    estimatedValue: Float
    estimatedValueUsd: Float
    currencyId: Int
    rfpType: Int
    workflowComment: String
    workflowReasonCodeId: Int
    clientName: String
    accountType: String
    sector: String
    website: String
    city: String
    state: String
    country: String
    streetAddress: String
    contacts: [OpportunityContact!]!
    proposalQuestions: [String!]!
    proposalQuestionIds: [Int]!
    proposalQuestionCategories: [String]!
    proposalQuestionnaireTypeIds: [Int]!
  }

  type OpportunityStageHistory {
    id: ID!
    stageId: Int!
    subStageId: Int!
    reachedAt: String!
    updatedBy: Int
    comment: String
  }

  type OpportunityContact {
    fullName: String!
    titleRole: String!
    email: String!
    phone: String!
    roleInDecision: Int
    roleInDecisionOther: String
  }

  type OpportunityEstimationRow { id: String!, workItem: String!, hours: String!, people: Int!, hourlyRate: String! }
  type OpportunityEstimation { revision: Int!, rows: [OpportunityEstimationRow!]!, assumptions: String!, total: String! }
  input OpportunityEstimationRowInput { id: String!, workItem: String!, hours: String!, people: Int!, hourlyRate: String! }
  input OpportunityEstimationInput { revision: Int!, rows: [OpportunityEstimationRowInput!]!, assumptions: String!, total: String }

  type RfpIntakeOpportunity {
    opportunityId: Int!
    opportunityName: String!
    opportunityNumber: String!
  }

  type OpportunityDirectoryClient {
    clientId: Int!
    clientName: String!
    accountType: String
    sector: String
    website: String
    city: String
    state: String
    country: String
    streetAddress: String
    contacts: [OpportunityContact!]!
  }

  input RfpIntakeClientInput {
    clientName: String!
    accountType: String!
    sector: String!
    website: String
    city: String!
    state: String!
    country: String!
    streetAddress: String
  }

  input RfpIntakeContactInput {
    fullName: String!
    titleRole: String!
    email: String!
    phone: String!
    roleInDecision: Int!
    roleInDecisionOther: String
  }

  input RfpQuestionSelectionInput {
    questionId: Int!
    question: String!
    category: String
    questionnaireTypeId: Int
  }

  input CreateRfpIntakeOpportunityInput {
    clientId: Int
    opportunityDescription: String
    contractTerm: String
    incumbentVendor: String
    preBidmeeting: Int
    leadReceivedDate: String
    opportunityName: String!
    ownerId: Int!
    currencyId: Int!
    estimatedValue: Float!
    sourceTypeId: Int!
    rfpType: Int!
    priority: String
    serviceLine: String
    solicitationNumber: String
    issuingAgency: String
    procurementContact: String
    queDueDate: String
    proposalDueDate: String
    submissionMethod: String
    fileName: String
    documentType: String
    docSubmissionFormat: String
    evaluationBasis: String
    questions: [String!]!
    questionSelections: [RfpQuestionSelectionInput!]
    client: RfpIntakeClientInput!
    contacts: [RfpIntakeContactInput!]!
  }

  input UpdateRfpIntakeOpportunityInput {
    opportunityDescription: String
    contractTerm: String
    incumbentVendor: String
    preBidmeeting: Int
    leadReceivedDate: String
    opportunityName: String!
    ownerId: Int!
    currencyId: Int!
    estimatedValue: Float!
    sourceTypeId: Int!
    rfpType: Int!
    priority: String
    serviceLine: String
    solicitationNumber: String
    issuingAgency: String
    procurementContact: String
    queDueDate: String
    proposalDueDate: String
    submissionMethod: String
    fileName: String
    documentType: String
    docSubmissionFormat: String
    evaluationBasis: String
    questions: [String!]!
    questionSelections: [RfpQuestionSelectionInput!]
    client: RfpIntakeClientInput!
    contacts: [RfpIntakeContactInput!]!
  }

  input CreateOpportunityInput {
    proposalQuestionSelections: [OpportunityProposalQuestionInput!]
    opportunityName: String
    opportunityTypeId: Int
    sourceTypeId: Int
    clientId: Int
    stageId: Int
    subStageId: Int
    ownerId: Int
    assignedTo: Int

    priority: String
    serviceLine: String

    solicitationNumber: String
    issuingAgency: String
    procurementContact: String
    queDueDate: String
    submissionMethod: String
    contractTerm: String
    incumbentVendor: String
    preBidMeeting: Int

    documentType: String
    fileName: String
    filePath: String
    uploadedBy: Int
    uploadedDt: String
    docSubmissionFormat: String
    evaluationBasis: String
    # Links the question-extraction upload (question_documents.id) to this opportunity.
    # Independent of fileName/filePath, which are display metadata only.
    sourceDocumentId: String

    opportunityDescription: String

    leadReceivedDate: String
    expectedStartDate: String
    expectedCloseDate: String
    proposalDueDate: String

    estimatedValue: Float
    estimatedValueUsd: Float
    currencyId: Int
    rfpType: Int

    createdBy: Int
  }

  input UpdateOpportunityInput {
    proposalQuestionSelections: [OpportunityProposalQuestionInput!]
    opportunityName: String
    opportunityTypeId: Int
    sourceTypeId: Int
    clientId: Int
    stageId: Int
    subStageId: Int
    ownerId: Int
    assignedTo: Int

    priority: String
    serviceLine: String

    solicitationNumber: String
    issuingAgency: String
    procurementContact: String
    queDueDate: String
    submissionMethod: String
    contractTerm: String
    incumbentVendor: String
    preBidMeeting: Int

    documentType: String
    fileName: String
    filePath: String
    uploadedBy: Int
    uploadedDt: String
    docSubmissionFormat: String
    evaluationBasis: String
    # Links the question-extraction upload (question_documents.id) to this opportunity.
    # Independent of fileName/filePath, which are display metadata only.
    sourceDocumentId: String

    opportunityDescription: String

    leadReceivedDate: String
    expectedStartDate: String
    expectedCloseDate: String
    proposalDueDate: String

    estimatedValue: Float
    estimatedValueUsd: Float
    currencyId: Int
    rfpType: Int

    updatedBy: Int
  }

  input OpportunityProposalQuestionInput {
    questionId: Int
    question: String!
    category: String
    questionnaireTypeId: Int
  }

  enum OpportunityWorkflowAction {
    REQUEST_CHANGES
    HOLD
    APPROVE
    RESUBMIT
      SUBMIT_ESTIMATE
    REJECT
    BID_SUBMITTED
    START_NEGOTIATION
    MARK_WON
    MARK_LOST
    OPPORTUNITY_HOLD
    RESUME_NEGOTIATION
    RESUME_PROPOSAL
    CLOSE_OPPORTUNITY
  }

  extend type Query {
    opportunityClientCreateAllowed: Boolean!
    opportunityClientUpdateAllowed: Boolean!
    opportunities(queue: String = "PIPELINE"): [Opportunity!]!
    opportunityClients: [OpportunityDirectoryClient!]!

    opportunity(
      opportunityId: Int!
    ): Opportunity

  }

  extend type Mutation {
    saveOpportunityEstimation(opportunityId: Int!, estimation: OpportunityEstimationInput!): Opportunity!
    updateOpportunityClient(clientId: Int!, client: RfpIntakeClientInput!, contacts: [RfpIntakeContactInput!]!): OpportunityDirectoryClient!
    createOpportunityClient(client: RfpIntakeClientInput!, contacts: [RfpIntakeContactInput!]!): OpportunityDirectoryClient!
    createOpportunity(
      input: CreateOpportunityInput!
    ): Opportunity!

    updateOpportunity(
      opportunityId: Int!
      input: UpdateOpportunityInput!
    ): Opportunity!

    createRfpIntakeOpportunity(input: CreateRfpIntakeOpportunityInput!): RfpIntakeOpportunity!
    updateRfpIntakeOpportunity(opportunityId: Int!, input: UpdateRfpIntakeOpportunityInput!): Opportunity!
    transitionOpportunity(
      opportunityId: Int!
      action: OpportunityWorkflowAction!
      comment: String
      opportunityDescription: String
      reasonCodeId: Int
    ): Opportunity!
  }
`;

export default opportunityTypeDefs;
