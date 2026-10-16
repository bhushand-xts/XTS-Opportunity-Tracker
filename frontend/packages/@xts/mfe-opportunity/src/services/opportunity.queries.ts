import { gql } from '@apollo/client';

export const TRANSITION_OPPORTUNITY = gql`
  mutation TransitionOpportunity($opportunityId: Int!, $action: OpportunityWorkflowAction!, $comment: String, $reasonCodeId: Int) {
    transitionOpportunity(opportunityId: $opportunityId, action: $action, comment: $comment, reasonCodeId: $reasonCodeId) { opportunityId stageId subStageId }
  }
`;

export const GET_HOLD_REASONS = gql`
  query OpportunityHoldReasons { reasonCodesList { id reasonName isActive displayOrder } }
`;

// Implemented master-data operations only. No proposed workflow is sent live.
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
  }
`;

export const LIST_OPPORTUNITIES = gql`
  ${OPPORTUNITY_FIELDS}
  query ListOpportunities($queue: String = "PIPELINE") {
    opportunities(queue: $queue) { ...OpportunityFields }
    currencies { currencyId currencyCode currencySymbol currencyName }
  }
`;

export const GET_OPPORTUNITY = gql`
  ${OPPORTUNITY_FIELDS}
  query GetOpportunity($opportunityId: Int!) {
    opportunity(opportunityId: $opportunityId) { ...OpportunityFields }
    currencies { currencyId currencyCode currencySymbol currencyName }
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
