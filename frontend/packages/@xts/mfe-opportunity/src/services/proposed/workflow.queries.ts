// PROPOSED ONLY. ProductionOpportunityService does not import these documents.
import { gql } from '@apollo/client';
export const WORKSPACE_FIELDS = gql`fragment WorkspaceFields on WorkflowWorkspace { id number title estimatedValue currencyCode clientName owner { id name email roles active } priority state rfpType submissionDeadline revision packageRevision allowedActions form { title estimatedValue currencyId serviceLine leadSource ownerId priority description clientId solicitation { reference version issuingAgency procurementContact submissionMethod vendorDemo portalUrl submissionEmail deliveryInstructions contractTerm incumbentVendor preBidMeeting submissionTimezone } dates { issueDate questionsDue proposalDue submissionDeadline additionalDeadline additionalDeadlineLabel } context { instructions submissionRequirements opportunityOverview scopeOfWork requirements notes } rfp { type source { id name downloadUrl } extraction { id state error } questions { id masterQuestionId text sourceReference validated } sections { key instructions } submissionFormat outputFormat pageRules evaluation } } client { id revision name relationship accountTypeId industryId accountTypeName industryName website address country stateProvince city streetAddress primaryContact { id name title email phone decisionRole } additionalContacts { id name email } allowedActions } visibleModules responses { id title sourceValidated sourceReference owner { id name email roles active } reviewer { id name email roles active } dueDate answer state revision submittedRevision approvedRevision reviewComment allowedActions } estimation { revision rows { id workItem hours people hourlyRate } assumptions total } scope { revision objective deliverables inclusions exclusions dependencies acceptance } activity { id action actor { id name email roles active } at note packageRevision } responsible { id name email roles active } readiness { ready issues } salesRecommendation { actor { id name email roles active } note packageRevision } }
`;
export const CLIENT_FIELDS = gql`fragment ClientFields on WorkflowClient { id revision name relationship accountTypeId industryId accountTypeName industryName website address country stateProvince city streetAddress primaryContact { id name title email phone decisionRole } additionalContacts { id name email } allowedActions }
`;
export const OPPORTUNITY_PAGE = gql`query OpportunityWorkflowPage($filter: WorkflowListInput!) { opportunityWorkflowPage(filter: $filter) { nodes { id number title estimatedValue currencyCode clientName owner { id name email roles active } priority state rfpType submissionDeadline revision packageRevision allowedActions } totalCount endCursor hasNextPage } }
`;
export const OPPORTUNITY_WORKSPACE = gql`query OpportunityWorkspace($id: ID!, $mode: WorkflowMode!) { opportunityWorkspace(id:$id, mode:$mode) { ...WorkspaceFields } }
${WORKSPACE_FIELDS}
`;
export const CLIENT_PAGE = gql`query ClientDirectoryPage($search:String!, $after:String, $first:Int!) { clientDirectoryPage(search:$search, after:$after, first:$first) { nodes { ...ClientFields } totalCount endCursor hasNextPage } }
${CLIENT_FIELDS}
`;
export const ELIGIBLE_USERS = gql`query EligibleOpportunityUsers($input:WorkflowEligibleInput!) { eligibleOpportunityUsers(input:$input) { nodes { id name email roles active } totalCount endCursor hasNextPage } }
`;
export const EXTRACTION_STATUS = gql`query OpportunityExtractionStatus($opportunityId:ID!, $jobId:ID!) { opportunityExtractionStatus(opportunityId:$opportunityId, jobId:$jobId) { ...WorkspaceFields } }
${WORKSPACE_FIELDS}
`;
export const SAVEOPPORTUNITYWORKFLOW = gql`mutation SaveOpportunityWorkflow($input:WorkflowSaveInput!) { saveOpportunityWorkflow(input:$input) { ...WorkspaceFields } }
${WORKSPACE_FIELDS}
`;
export const SAVEOPPORTUNITYCLIENT = gql`mutation SaveOpportunityClient($input:WorkflowClientSaveInput!) { saveOpportunityClient(input:$input) { ...ClientFields } }
${CLIENT_FIELDS}
`;
export const UPLOADOPPORTUNITYSOURCE = gql`mutation UploadOpportunitySource($input:WorkflowUploadInput!) { uploadOpportunitySource(input:$input) { id name downloadUrl } }
`;
export const STARTOPPORTUNITYEXTRACTION = gql`mutation StartOpportunityExtraction($input:WorkflowExtractInput!) { startOpportunityExtraction(input:$input) { ...WorkspaceFields } }
${WORKSPACE_FIELDS}
`;
export const SAVEOPPORTUNITYESTIMATION = gql`mutation SaveOpportunityEstimation($input:WorkflowEstimateSaveInput!) { saveOpportunityEstimation(input:$input) { ...WorkspaceFields } }
${WORKSPACE_FIELDS}
`;
export const SAVEOPPORTUNITYSCOPE = gql`mutation SaveOpportunityScope($input:WorkflowScopeSaveInput!) { saveOpportunityScope(input:$input) { ...WorkspaceFields } }
${WORKSPACE_FIELDS}
`;
export const ASSIGNOPPORTUNITYRESPONSE = gql`mutation AssignOpportunityResponse($input:WorkflowAssignmentInput!) { assignOpportunityResponse(input:$input) { ...WorkspaceFields } }
${WORKSPACE_FIELDS}
`;
export const SAVEOPPORTUNITYANSWER = gql`mutation SaveOpportunityAnswer($input:WorkflowAnswerInput!) { saveOpportunityAnswer(input:$input) { ...WorkspaceFields } }
${WORKSPACE_FIELDS}
`;
export const REVIEWOPPORTUNITYANSWER = gql`mutation ReviewOpportunityAnswer($input:WorkflowAnswerReviewInput!) { reviewOpportunityAnswer(input:$input) { ...WorkspaceFields } }
${WORKSPACE_FIELDS}
`;
export const SUBMITOPPORTUNITYSALESREVIEW = gql`mutation SubmitOpportunitySalesReview($input:WorkflowSubmitInput!) { submitOpportunitySalesReview(input:$input) { ...WorkspaceFields } }
${WORKSPACE_FIELDS}
`;
export const DECIDEOPPORTUNITYPACKAGE = gql`mutation DecideOpportunityPackage($input:WorkflowDecisionInput!) { decideOpportunityPackage(input:$input) { ...WorkspaceFields } }
${WORKSPACE_FIELDS}
`;

export const GLOBAL_ACTIONS = gql`query OpportunityWorkflowActions { opportunityWorkflowActions }`;
