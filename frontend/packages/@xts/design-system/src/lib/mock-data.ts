/**
 * Placeholder domain types and seed data — SCAFFOLDING.
 * Ported alongside AppShell/DashboardContent/etc. so they type-check and
 * render with something on screen. Replace with real domain types and data
 * sourced from @xts/api-contracts / @xts/api-client before shipping.
 */

// The full opportunity lifecycle (Section: pipeline mockup's stage bar).
// Identified (pre-qualification), Presentation and Won aren't kanban board
// columns — see BOARD_COLUMNS — but are still valid stages for the fuller
// stage-bar view a later phase adds to the opportunity detail page.
export const STAGES = [
  "Identified",
  "Qualifying",
  "Solutioning",
  "Estimation",
  "Estimate Review",
  "Proposal",
  "Presentation",
  "Negotiation",
  "Won",
] as const;
export type Stage = (typeof STAGES)[number];

export interface StageColumn {
  stage: Stage;
  gate?: "Gate 1" | "Gate 2";
}

/** The 6 stages the Pipeline kanban board actually shows as columns,
 * in order, each optionally requiring a gate decision to leave it. */
export const BOARD_COLUMNS: StageColumn[] = [
  { stage: "Qualifying", gate: "Gate 1" },
  { stage: "Solutioning" },
  { stage: "Estimation" },
  { stage: "Estimate Review", gate: "Gate 2" },
  { stage: "Proposal" },
  { stage: "Negotiation" },
];

export type Role = "Sales Rep" | "Sales Manager" | "Sales Head" | "System Admin";

/** Which seat the pipeline is being viewed from (the mockup's role
 * switcher) — a different axis from `Role` above, which is the real
 * signed-in user's org-hierarchy title (see auth.ts). Never conflate them:
 * viewing the board as "Engineering" doesn't mean the signed-in user's real
 * role is Engineering. */
export type PipelineRole = "Sales" | "Engineering" | "Management";

/** How an RFP-based opportunity's questions get answered — set by the
 * intake wizard (a later phase); null until then. */
export type RfpIntakeType = "Questionnaire" | "Generic";

// Fixed option lists for the New Opportunity wizard's Selects — values taken
// directly from the mockup's own <option> lists.
export const CURRENCIES = [
  { code: "USD", label: "USD ($)" },
  { code: "EUR", label: "EUR (€)" },
  { code: "GBP", label: "GBP (£)" },
  { code: "INR", label: "INR (₹)" },
] as const;
export type CurrencyCode = (typeof CURRENCIES)[number]["code"];

export const SERVICE_LINES = [
  "Data & platform engineering",
  "Web & digital",
  "Mobile",
  "AI & analytics",
  "Managed services",
] as const;
export type ServiceLine = (typeof SERVICE_LINES)[number];

export const OPPORTUNITY_SOURCES = [
  "Public procurement portal",
  "Referral",
  "Inbound enquiry",
  "Existing client",
  "Partner",
  "Outbound",
  "Other",
] as const;

export const PRIORITIES = ["High", "Medium", "Low"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const RELATIONSHIPS = ["New client", "Existing client", "Repeat / renewal"] as const;
export type Relationship = (typeof RELATIONSHIPS)[number];

export const ACCOUNT_TYPES = [
  "Government — State",
  "Government — Federal",
  "Government — County",
  "Government — Municipal",
  "Nonprofit",
  "Education",
  "Commercial / private",
] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const SECTORS = [
  "Transportation",
  "Healthcare",
  "Utilities",
  "Public administration",
  "Education",
  "Financial services",
] as const;
export type Sector = (typeof SECTORS)[number];

export const COUNTRIES = ["United States", "Canada", "United Kingdom", "India", "Other"] as const;

export const DECISION_ROLES = [
  "Procurement / buyer",
  "Decision maker",
  "Technical evaluator",
  "Influencer",
  "End user",
] as const;
export type DecisionRole = (typeof DECISION_ROLES)[number];

/** A contact captured on an opportunity — embedded directly (not a
 * normalized/shared directory): the wizard has no contact picker, each
 * opportunity gets freshly-entered contacts. */
export interface Contact {
  id: string;
  name: string;
  title: string;
  email: string;
  phone: string;
  decisionRole: DecisionRole | null;
  /** True for the one contact captured as the opportunity's primary stakeholder
   * (always index 0 in the wizard's contact list) — lets downstream screens
   * tell it apart from secondary contacts without relying on array order. */
  isPrimary: boolean;
}

// Intake — the RFP-type-specific second step of the New Opportunity wizard.
// Fixed option lists taken from the mockup's own <option> lists.
export const SUBMISSION_METHODS = ["Online portal", "Email", "Physical / mail"] as const;
export type SubmissionMethod = (typeof SUBMISSION_METHODS)[number];

export const PRE_BID_OPTIONS = ["Not required", "Optional", "Mandatory"] as const;
export type PreBidOption = (typeof PRE_BID_OPTIONS)[number];

export const VENDOR_DEMO_OPTIONS = ["Yes", "No"] as const;
export type VendorDemoOption = (typeof VENDOR_DEMO_OPTIONS)[number];

export const PROPOSAL_SUBMISSION_FORMATS = [
  "Technical + Cost volumes",
  "Single proposal document",
  "Portal forms + attachments",
] as const;
export type ProposalSubmissionFormat = (typeof PROPOSAL_SUBMISSION_FORMATS)[number];

// The mockup checks the first 7 of these 8 by default, leaving "Assumptions &
// dependencies" unchecked.
export const REQUIRED_PROPOSAL_SECTIONS = [
  "Executive summary",
  "Understanding of requirements",
  "Technical approach & solution",
  "Project plan & timeline",
  "Team & key personnel",
  "Experience & references",
  "Pricing & commercials",
  "Assumptions & dependencies",
] as const;

/** Solicitation fields both intake paths collect. `contractTerm`,
 * `incumbentVendor` and `preBidMeeting` are Questionnaire-only — the mockup's
 * Generic intake screen doesn't have that third field row.
 *
 * `additionalDeadlineLabel`, `portalUrl`, `submissionEmail` and
 * `submissionAddress` are typed optional here because TypeScript can't
 * express "required unless a sibling field is set" — the intake zod schema
 * enforces that instead (additionalDeadlineLabel is required once
 * additionalDeadline is set; portalUrl/submissionEmail/submissionAddress are
 * required based on which submissionMethod is selected). Don't assume these
 * are present without checking the relevant sibling. */
export interface SolicitationDetails {
  solicitationNumber: string;
  issuingAgency: string;
  procurementContact: string;
  issueDate: string;
  version?: string;
  questionsDue: string;
  proposalDueDate: string;
  submissionDeadline: string;
  additionalDeadline?: string;
  additionalDeadlineLabel?: string;
  submissionMethod: SubmissionMethod;
  portalUrl?: string;
  submissionEmail?: string;
  submissionAddress?: string;
  instructions?: string;
  vendorDemonstrationRequired: VendorDemoOption;
  submissionRequirements?: string;
  opportunityOverview?: string;
  scopeOfWork?: string;
  keyRequirements?: string;
  notes?: string;
  contractTerm?: string;
  incumbentVendor?: string;
  preBidMeeting?: PreBidOption;
}

/** Metadata only — no real upload backend exists yet (see the plan's
 * backend-gaps notes), so this stores what a browser file picker/drop gives
 * you (name, size), never the file's actual content. */
export interface UploadedDocument {
  id: string;
  fileName: string;
  fileSizeLabel: string;
  uploadedAt: string;
  status: "Ready" | "Processing" | "Failed";
}

// RFP-specific questions — Questionnaire path only (the Generic path collects
// proposal sections instead, see ProposalRequirements below). A question may
// come from the Generic RFP Question Master (admin CRUD, a separate reusable
// template library — see RFP_QUESTION_CATEGORIES below, shared with it),
// from AI extraction of an uploaded document, or manual entry.
export const QUESTION_TYPES = [
  "Short Text",
  "Long Text",
  "Yes/No",
  "Single Select",
  "Multi Select",
  "Numeric",
  "Currency",
  "Date",
  "File Attachment",
  "Structured Table",
] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

// "Template"/"Imported" sources aren't built yet — only these three exist today.
export const QUESTION_SOURCES = ["Generic Master", "AI Extracted", "Manual"] as const;
export type QuestionSource = (typeof QUESTION_SOURCES)[number];

export const REVIEW_STATUSES = ["Under review", "Reviewed"] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

/** Fixed category list, shared by the Generic RFP Question Master (admin) and
 * RFP-specific questions here. Hardcoded because the master's own backend
 * table (mst_rfp_questions) has no category column yet — see
 * mfe-admin's rfpQuestionCategories.ts, which re-exports this list. */
export const RFP_QUESTION_CATEGORIES = [
  "Technical",
  "Commercial",
  "Legal / Compliance",
  "Company Profile",
  "Past Performance",
] as const;

/** A group of questions within an RFP (Question Organization). Deleting a
 * section unsets `sectionId` on its questions — it never deletes them. */
export interface RfpSection {
  id: string;
  opportunityId: string;
  name: string;
  description?: string;
  displayOrder: number;
  ownerId?: string;
  dueDate?: string;
}

export const ASSIGNMENT_STATUSES = ["Unassigned", "Assigned", "Reassigned"] as const;
export type AssignmentStatus = (typeof ASSIGNMENT_STATUSES)[number];

// The answer's own lifecycle (Stages 8-9) — distinct from `reviewStatus`
// (is the question itself vetted) and `assignmentStatus` (is it assigned to
// someone). Collapses the business spec's ANSWER_SUBMITTED/UNDER_REVIEW into
// one "Submitted" state, since nothing else happens between them here (no
// separate "reviewer claims it" step).
export const ANSWER_STATUSES = ["Not Started", "In Progress", "Submitted", "Approved", "Rework Required"] as const;
export type AnswerStatus = (typeof ANSWER_STATUSES)[number];

/** One RFP-specific question. `sourceQuestionId` links back to the admin
 * master's RfpQuestion.id when source = "Generic Master"; `sourceDocument`/
 * `sourcePage`/`aiConfidence` are set when source = "AI Extracted". Every
 * question starts "Under review" regardless of source — even a vetted master
 * question may need contextual tailoring per RFP, so none are auto-approved.
 * `sectionId` links to RfpSection — undefined means "Unsectioned". `withdrawn`
 * is a soft delete, consistent with the master's "Deactivate" — never a hard
 * delete. `assigneeId`/`reviewerId` are StoreUser ids. */
export interface RfpQuestionItem {
  id: string;
  opportunityId: string;
  number: number;
  questionText: string;
  type: QuestionType;
  category: string;
  sectionId?: string;
  mandatory: boolean;
  priority: Priority;
  source: QuestionSource;
  sourceQuestionId?: number;
  sourceDocument?: string;
  sourcePage?: number;
  aiConfidence?: number;
  reviewStatus: ReviewStatus;
  reviewerNotes?: string;
  assigneeId?: string;
  reviewerId?: string;
  dueDate?: string;
  assignmentNotes?: string;
  assignmentStatus: AssignmentStatus;
  // Answer Workspace / Internal Review (Stages 8-9). answerOptions configures
  // Single/Multi Select's picker; answerValues is Multi Select only, every
  // other text-like type (including Structured Table's simplified fallback)
  // uses answerValue; answerDocument is the answer itself when type is File
  // Attachment. supportingEvidence is separate — optional additional evidence
  // for any question type, not the answer. answererNotes is the assignee's
  // own working notes — distinct from reviewerNotes above (a comment on the
  // question itself) and from answerReviewComment/reworkReason below (the
  // reviewer's decision on the answer). answerVersion increments only when a
  // Rework Required answer is resubmitted.
  answerOptions?: string[];
  answerValue?: string;
  answerValues?: string[];
  answerDocument?: UploadedDocument;
  supportingEvidence?: UploadedDocument;
  answererNotes?: string;
  answerStatus: AnswerStatus;
  answerVersion: number;
  answerReviewComment?: string;
  reworkReason?: string;
  withdrawn: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Generic RFP path only. */
export interface ProposalRequirements {
  submissionFormat: ProposalSubmissionFormat;
  pageLimit: string;
  evaluationBasis: string;
  requiredSections: string[];
}

// Generic RFP path's equivalent of an RfpQuestionItem — notably simpler, no
// mandatory flag/priority/source/reviewer, and no multi-stage review loop:
// just draft it, and flip status to Final when it's done. Seeded one-per-item
// from ProposalRequirements.requiredSections when the intake form is submitted.
export const PROPOSAL_SECTION_STATUSES = ["Not Started", "Assigned", "Drafting", "Final"] as const;
export type ProposalSectionStatus = (typeof PROPOSAL_SECTION_STATUSES)[number];

export interface ProposalSection {
  id: string;
  opportunityId: string;
  number: number;
  title: string;
  volume: string;
  content?: string;
  assigneeId?: string;
  status: ProposalSectionStatus;
  withdrawn: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OpportunityClosure {
  outcome: "Won" | "Lost" | "Hold";
  [field: string]: string;
}

// Stage 11. "Not generated" is the implicit state when Opportunity.finalResponse
// is undefined — no need to initialize this at opportunity creation time.
export const FINAL_RESPONSE_STATUSES = ["Not generated", "Generated", "Sent for approval"] as const;
export type FinalResponseStatus = (typeof FINAL_RESPONSE_STATUSES)[number];

export interface FinalResponse {
  version: number;
  title: string;
  description: string;
  exceptions?: string;
  preparedBy: string;
  generatedAt: string;
  status: FinalResponseStatus;
}

export interface Opportunity {
  id: string;
  name: string;
  customerId: string;
  contacts: Contact[];
  ownerId: string;
  team: string;
  source: string;
  serviceLine: ServiceLine;
  priority: Priority;
  value: number;
  currency: string;
  probability: number;
  expectedClose: string;
  stage: Stage;
  requirements: string;
  tags: string[];
  closure?: OpportunityClosure;
  rfpType: RfpIntakeType | null;
  solicitation?: SolicitationDetails;
  document?: UploadedDocument;
  proposalRequirements?: ProposalRequirements;
  finalResponse?: FinalResponse;
}

export type ActivityType = "Call" | "Meeting" | "Email" | "Task" | "Note" | "Follow-up";

export interface Activity {
  id: string;
  opportunityId: string;
  type: ActivityType;
  subject: string;
  notes: string;
  date: string;
  userId: string;
  done?: boolean;
}

export interface Approval {
  id: string;
  opportunityId: string;
  type: string;
  status: "Pending" | "Approved" | "Rejected";
  requestedBy: string;
}

export interface HistoryEntry {
  id: string;
  opportunityId: string;
  what: string;
  date: string;
}

export interface Customer {
  id: string;
  name: string;
  relationship: Relationship;
  accountType: AccountType;
  sector: Sector;
  website: string;
  city: string;
  state: string;
  country: string;
  address: string;
}

export interface StoreUser {
  id: string;
  name: string;
  team: string;
}

export const LOST_REASONS = ["Budget", "Timing", "Competitor", "No decision", "Requirements mismatch"];
