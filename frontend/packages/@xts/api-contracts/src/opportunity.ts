/** Opportunity workflow contract shared with the authenticated gateway. */
export type Decimal = string;
export type LocalDate = string;
export type OpportunityState = 'PREPARATION_PENDING' | 'IN_PROGRESS' | 'SALES_REVIEW' | 'GATE1_PENDING' | 'GATE1_GO' | 'SALES_REJECTED' | 'GATE1_NO_GO';
export type ResponseState = 'UNASSIGNED' | 'ASSIGNED' | 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'CHANGES_REQUESTED';
export type Module = 'overview' | 'responses' | 'estimation' | 'scope' | 'assignment' | 'activity';
export type Action = 'EDIT' | 'ASSIGN' | 'SAVE_ANSWER' | 'SUBMIT_ANSWER' | 'REVIEW_ANSWER' | 'EDIT_ESTIMATION' | 'EDIT_SCOPE' | 'SALES_APPROVE' | 'SALES_REQUEST_CHANGES' | 'SALES_HOLD' | 'SALES_REJECT' | 'GATE1_GO' | 'GATE1_REQUEST_CHANGES' | 'GATE1_HOLD' | 'GATE1_NO_GO' | 'SUBMIT_ESTIMATE' | 'ESTIMATE_APPROVE' | 'ESTIMATE_HOLD' | 'ESTIMATE_REJECT' | 'BID_SUBMITTED' | 'START_NEGOTIATION' | 'MARK_WON' | 'MARK_LOST' | 'CLOSE_OPPORTUNITY' | 'RESUBMIT' | 'UPLOAD' | 'EXTRACT' | 'CLIENT_CREATE' | 'CLIENT_UPDATE';
export interface DirectoryUser { id: string; name: string; email: string; roles: string[]; active: boolean; }
export interface Contact { id?: string; name: string; title: string; email: string; phone: string; decisionRole: string; decisionRoleOther?: string; }
export type AdditionalContact = Contact;
export interface ClientDraft {
  name: string; relationship: string; accountTypeId: string; industryId: string; website: string;
  address: string; country: string; stateProvince: string; city: string; streetAddress: string;
  primaryContact: Contact; additionalContacts: AdditionalContact[];
}
export interface OpportunityClient extends ClientDraft { id: string; revision: number; accountTypeName: string; industryName: string; allowedActions: Action[]; }
export interface Solicitation {
  reference: string; version: string; issuingAgency: string; procurementContact: string;
  submissionMethod: '' | 'PORTAL' | 'EMAIL' | 'PHYSICAL'; vendorDemo: 'UNCONFIRMED' | 'YES' | 'NO';
  portalUrl: string; submissionEmail: string; deliveryInstructions: string; contractTerm: string;
  incumbentVendor: string; preBidMeeting: '' | 'UNCONFIRMED' | 'YES' | 'NO'; submissionTimezone: string;
}
export interface ImportantDates { issueDate: LocalDate; questionsDue: LocalDate; proposalDue: LocalDate; submissionDeadline: LocalDate; additionalDeadline: LocalDate; additionalDeadlineLabel: string; }
export interface RfpContext { instructions: string; submissionRequirements: string; opportunityOverview: string; scopeOfWork: string; requirements: string; notes: string; }
export interface SourceDocument { id: string; name: string; storagePath?: string; downloadUrl: string | null; }
// category is persisted with opportunity questions; sourceOrder is only used to order extracted questions.
export interface PreparedQuestion { id: string; text: string; sourceReference: string; validated: boolean; masterQuestionId?: number | null; category?: string | null; sourceOrder?: number; }
export interface ProposalSection { key: string; instructions: string; }
export interface RfpDraft {
  type: 'QUESTIONNAIRE' | 'GENERIC' | null; source: SourceDocument | null;
  extraction: { id: string; state: 'PROCESSING' | 'SUCCEEDED' | 'FAILED'; error: string | null } | null;
  questions: PreparedQuestion[]; sections: ProposalSection[];
  submissionFormat: 'TECHNICAL_COST' | 'COMBINED'; outputFormat: 'PDF' | 'DOCX' | 'PPTX';
  evaluation: string;
}
export interface OpportunityDraft {
  title: string; estimatedValue: Decimal; estimatedValueUsd?: Decimal; serviceLineOther?: string; currencyId: string; serviceLine: string; leadSource: string;
  ownerId: string; priority: '' | 'LOW' | 'MEDIUM' | 'HIGH'; description: string; clientId: string | null;
  solicitation: Solicitation; dates: ImportantDates; context: RfpContext; rfp: RfpDraft;
}
export interface OpportunitySummary {
  id: string; number: string; title: string; estimatedValue: Decimal; estimatedValueUsd?: Decimal; currencyCode: string; currencySymbol?: string;
  clientName: string | null; owner: DirectoryUser | null; createdBy?: DirectoryUser | null; priority: OpportunityDraft['priority'];
  createdDt?: string | null;
  state: OpportunityState; stageId?: number | null; subStageId?: number | null; holdReasonCodeId?: number | null; rfpType: RfpDraft['type']; submissionDeadline: LocalDate | null;
  revision: number; packageRevision: number | null; allowedActions: Action[];
}
export interface EstimateRow { id: string; workItem: string; hours: Decimal; people: number; hourlyRate: Decimal; }
export interface Estimation { revision: number; rows: EstimateRow[]; assumptions: string; total: Decimal; }
export type RiskSeverity = 'LOW' | 'MEDIUM' | 'HIGH';
export interface AlignmentItem { id: string; text: string; }
export interface RiskItem { id: string; description: string; severity: RiskSeverity; }
export interface Scope { revision: number; summary: string; alignment: AlignmentItem[]; risks: RiskItem[]; }
export interface ResponseItem {
  id: string; title: string; sourceValidated: boolean; sourceReference: string | null;
  owner: DirectoryUser | null; reviewer: DirectoryUser | null; dueDate: LocalDate | null;
  answer: string; state: ResponseState; revision: number; submittedRevision: number | null;
  approvedRevision: number | null; reviewComment: string | null; allowedActions: Action[];
}
export interface ActivityEvent { id: string; action: string; actor: DirectoryUser; at: string; note: string | null; packageRevision: number | null; }
export interface OpportunityStageHistory { id: string; stageId: number; subStageId: number; reachedAt: string; actor?: DirectoryUser | null; comment?: string | null; }
export interface OpportunityDetail extends OpportunitySummary {
  stageHistory?: OpportunityStageHistory[];
  form: OpportunityDraft; client: OpportunityClient | null; visibleModules: Module[];
  /** Restricted values must be null/redacted on the backend, not merely hidden. */
  responses: ResponseItem[] | null; estimation: Estimation | null; scope: Scope | null;
  activity: ActivityEvent[] | null; responsible: DirectoryUser | null; approvalAssignees: DirectoryUser[];
  readiness: { ready: boolean; issues: string[] };
  salesRecommendation: { actor: DirectoryUser; note: string | null; packageRevision: number } | null;
}
export interface Page<T> { nodes: T[]; totalCount: number; endCursor: string | null; hasNextPage: boolean; }
export interface ListFilter { search: string; queue: 'PIPELINE' | 'MY_WORK' | 'MY_APPROVALS'; after: string | null; first: number; }
export interface SaveCommand { id: string | null; expectedRevision: number | null; idempotencyKey: string; form: OpportunityDraft; }
export interface VersionCommand { opportunityId: string; expectedRevision: number; idempotencyKey: string; }
export interface ResponseCommand extends VersionCommand { responseId: string; responseRevision: number; }
export interface DecisionCommand extends VersionCommand {
  packageRevision: number | null;
  expectedStageId?: number | null; expectedSubStageId?: number | null;
  reasonCodeId?: number | null;
  decision: 'SALES_APPROVE' | 'SALES_REQUEST_CHANGES' | 'SALES_HOLD' | 'SALES_REJECT' | 'GATE1_GO' | 'GATE1_REQUEST_CHANGES' | 'GATE1_HOLD' | 'GATE1_NO_GO' | 'SUBMIT_ESTIMATE' | 'ESTIMATE_APPROVE' | 'ESTIMATE_HOLD' | 'ESTIMATE_REJECT' | 'BID_SUBMITTED' | 'START_NEGOTIATION' | 'MARK_WON' | 'MARK_LOST' | 'CLOSE_OPPORTUNITY' | 'RESUBMIT';
  reason: string; confirmed: boolean;
}
export interface LookupOption { id: string; label: string; code?: string; }
export interface OpportunityLookups { currencies: LookupOption[]; industries: LookupOption[]; accountTypes: LookupOption[]; }
