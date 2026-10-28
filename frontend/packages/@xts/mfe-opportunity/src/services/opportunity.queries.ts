import { gql } from '@apollo/client';

// These operations use the existing production schema.
export const GET_OPPORTUNITY_LOOKUPS = gql`
  query OpportunityLookups {
    currencies { currencyId currencyName currencyCode currencySymbol isActive }
    industries { industryId industryName isActive }
    accountTypes { accountTypeId accountName isActive }
  }
`;

const OPPORTUNITY_FIELDS = gql`
  fragment OpportunityFields on Opportunity {
    allowedActions
    opportunityId
    opportunityNumber
    opportunityName
    sourceTypeId
    clientId
    stageId
    subStageId
    ownerId
    createdBy
    createdDt
    assignedTo
    priority
    serviceLine
    solicitationNumber
    issuingAgency
    procurementContact
    queDueDate
    submissionMethod
    contractTerm
    incumbentVendor
    preBidMeeting
    documentType
    fileName
    filePath
    docSubmissionFormat
    evaluationBasis
    opportunityDescription
    leadReceivedDate
    proposalDueDate
    estimatedValue
    estimatedValueUsd
    currencyId
    rfpType
    workflowComment
    workflowReasonCodeId
    clientName
    accountType
    sector
    website
    city
    state
    country
    streetAddress
    contacts { fullName titleRole email phone roleInDecision roleInDecisionOther }
    proposalQuestions
    proposalQuestionIds
    proposalQuestionCategories
    proposalQuestionnaireTypeIds
  }
`;

export const LIST_OPPORTUNITIES = gql`
  ${OPPORTUNITY_FIELDS}
  query ListOpportunities($queue: String = "PIPELINE") {
    opportunities(queue: $queue) { ...OpportunityFields }
    currencies { currencyId currencyCode currencySymbol }
  }
`;

export const GET_OPPORTUNITY = gql`
  ${OPPORTUNITY_FIELDS}
  query GetOpportunity($opportunityId: Int!) {
    opportunity(opportunityId: $opportunityId) {
      ...OpportunityFields
      responses { id title category answer revision allowedActions }
      stageHistory { id stageId subStageId reachedAt updatedBy comment }
      estimation { revision rows { id workItem hours people hourlyRate } assumptions total }
      scope { revision summary risks { id description severity } alignment { id text } }
    }
    currencies { currencyId currencyCode currencySymbol }
  }
`;

export const SAVE_OPPORTUNITY_ESTIMATION = gql`
  mutation SaveOpportunityEstimation($opportunityId: Int!, $estimation: OpportunityEstimationInput!) {
    saveOpportunityEstimation(opportunityId: $opportunityId, estimation: $estimation) { opportunityId }
  }
`;

export const SAVE_OPPORTUNITY_SCOPE = gql`
  mutation SaveOpportunityScope($opportunityId: Int!, $scope: OpportunityScopeInput!, $section: OpportunityAssessmentSection = ALL) {
    saveOpportunityScope(opportunityId: $opportunityId, scope: $scope, section: $section) { opportunityId }
  }
`;

export const SAVE_OPPORTUNITY_ANSWER = gql`
  mutation SaveOpportunityAnswer($opportunityId: Int!, $responseId: Int!, $revision: Int!, $answer: String!) {
    saveOpportunityAnswer(opportunityId: $opportunityId, responseId: $responseId, revision: $revision, answer: $answer) { opportunityId }
  }
`;

export const LIST_OPPORTUNITY_CLIENTS = gql`
  query ListOpportunityClients {
    opportunityClients {
      clientId
      clientName
      accountType
      sector
      website
      city
      state
      country
      streetAddress
      contacts { fullName titleRole email phone roleInDecision roleInDecisionOther }
    }
  }
`;

export const CREATE_RFP_INTAKE_OPPORTUNITY = gql`
  mutation CreateRfpIntakeOpportunity($input: CreateRfpIntakeOpportunityInput!) {
    createRfpIntakeOpportunity(input: $input) { opportunityId }
  }
`;

export const UPDATE_RFP_INTAKE_OPPORTUNITY = gql`
  ${OPPORTUNITY_FIELDS}
  mutation UpdateRfpIntakeOpportunity($opportunityId: Int!, $input: UpdateRfpIntakeOpportunityInput!) {
    updateRfpIntakeOpportunity(opportunityId: $opportunityId, input: $input) { ...OpportunityFields }
  }
`;

export const CREATE_OPPORTUNITY = gql`
  ${OPPORTUNITY_FIELDS}
  mutation CreateOpportunity($input: CreateOpportunityInput!) {
    createOpportunity(input: $input) { ...OpportunityFields }
  }
`;

export const CREATE_OPPORTUNITY_CLIENT = gql`
  mutation CreateOpportunityClient($client: RfpIntakeClientInput!, $contacts: [RfpIntakeContactInput!]!) {
    createOpportunityClient(client: $client, contacts: $contacts) {
      clientId clientName accountType sector website city state country streetAddress
      contacts { fullName titleRole email phone roleInDecision roleInDecisionOther }
    }
  }
`;

export const UPDATE_OPPORTUNITY_CLIENT = gql`
  mutation UpdateOpportunityClient($clientId: Int!, $client: RfpIntakeClientInput!, $contacts: [RfpIntakeContactInput!]!) {
    updateOpportunityClient(clientId: $clientId, client: $client, contacts: $contacts) {
      clientId clientName accountType sector website city state country streetAddress
      contacts { fullName titleRole email phone roleInDecision roleInDecisionOther }
    }
  }
`;

export const GET_CLIENT_CREATE_ACCESS = gql`
  query OpportunityClientCreateAccess { opportunityClientCreateAllowed opportunityClientUpdateAllowed }
`;

export const UPDATE_OPPORTUNITY = gql`
  ${OPPORTUNITY_FIELDS}
  mutation UpdateOpportunity($opportunityId: Int!, $input: UpdateOpportunityInput!) {
    updateOpportunity(opportunityId: $opportunityId, input: $input) { ...OpportunityFields }
  }
`;

export const TRANSITION_OPPORTUNITY = gql`
  mutation TransitionOpportunity($opportunityId: Int!, $action: OpportunityWorkflowAction!, $comment: String, $reasonCodeId: Int) {
    transitionOpportunity(opportunityId: $opportunityId, action: $action, comment: $comment, reasonCodeId: $reasonCodeId) {
      opportunityId
      stageId
      subStageId
    }
  }
`;

export const GET_HOLD_REASON_CODES = gql`
  query OpportunityHoldReasonCodes {
    reasonCodesList { id reasonName description displayOrder isActive }
  }
`;
