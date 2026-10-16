export const opportunityTypeDefs = `#graphql

  type Opportunity {
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
  }

  type OpportunityContact {
    fullName: String!
    titleRole: String!
    email: String!
    phone: String!
    roleInDecision: Int
    roleInDecisionOther: String
  }

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
  }

  enum OpportunityWorkflowAction {
    REQUEST_CHANGES
    HOLD
    APPROVE
    RESUBMIT
      SUBMIT_ESTIMATE
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
    ): Opportunity!
  }
`;

export default opportunityTypeDefs;
