# RFP Question Workflow — GraphQL contract (PROPOSED, not implemented yet)

Everything in this document is a **proposal for the backend team to implement**, not a description of running code. The frontend (`frontend/packages/@xts/mfe-opportunity/src/features/rfp-questions/`) is built entirely against a mock, in-memory store today, but every hook it uses is deliberately shaped like the real Apollo `useQuery`/`useMutation` calls below — see `rfpQuestionItem.mockHooks.ts`, where each hook's doc comment points back to the operation it stands in for. Swapping the mock for a real backend should only mean replacing each hook's body; no consuming component should need to change.

**Where this plugs in:** `backend/services/opportunity` (port 4003), already wired into the gateway (`ENABLED_SUBGRAPHS=user,opportunity,admin`). Today it only has two placeholder types:

```graphql
type Opportunity { id: Int! }
type Stage { id: Int! }
extend type Query { opportunityList: [Opportunity]  stageList: [Stage] }
```

Everything below extends that same service — it does not need a new service, following the pattern in `backend/docs/GRAPHQL_API.md`.

**Not covered here:** turning an uploaded document into question text (real AI extraction) is a separate document-processing concern. This contract only covers CRUD and review state for the resulting `RfpQuestionItem` records, once they exist — same boundary the mock UI already assumes (it seeds a fixed set of mock questions on "Extract questions" rather than simulating extraction itself).

**Relationship to the Generic RFP Question Master:** the Master (`RfpQuestion` type, already real, in `backend/services/admin`) is a separate, reusable template library. An `RfpQuestionItem` may reference one via `sourceQuestionId` when `source = GENERIC_MASTER`, but the two types and tables are otherwise independent — do not merge them.

---

## Proposed types

```graphql
enum QuestionType {
  SHORT_TEXT
  LONG_TEXT
  YES_NO
  SINGLE_SELECT
  MULTI_SELECT
  NUMERIC
  CURRENCY
  DATE
  FILE_ATTACHMENT
  STRUCTURED_TABLE
}

# TEMPLATE / IMPORTED are named for future use — no UI path produces them yet.
enum QuestionSource {
  GENERIC_MASTER
  AI_EXTRACTED
  MANUAL
  TEMPLATE
  IMPORTED
}

enum ReviewStatus {
  UNDER_REVIEW
  REVIEWED
}

enum AssignmentStatus {
  UNASSIGNED
  ASSIGNED
  REASSIGNED
}

# The answer's own lifecycle (Stages 8-9) — distinct from ReviewStatus (is the
# question itself vetted) and AssignmentStatus (is it assigned). Collapses the
# business spec's ANSWER_SUBMITTED/UNDER_REVIEW into one SUBMITTED state,
# since nothing else happens between them here (no separate "reviewer claims
# it" step).
enum AnswerStatus {
  NOT_STARTED
  IN_PROGRESS
  SUBMITTED
  APPROVED
  REWORK_REQUIRED
}

# Stage 11. "NOT_GENERATED" is implicit (no FinalResponse row yet) — it's not
# worth a sentinel row, same convention as RfpQuestionItem's defaults.
enum FinalResponseStatus {
  GENERATED
  SENT_FOR_APPROVAL
}

type FinalResponseReadiness {
  ready: Boolean!
  blockingIssues: [String!]!
}

# One per opportunity (its own row or embedded on Opportunity, backend's call).
# version increments on every successful generateFinalResponse call, including
# regeneration. Real document generation (turning this into an actual
# proposal file/PDF) is a separate document-generation concern, same boundary
# already drawn for AI extraction — this only tracks the response's own
# content and status.
type FinalResponse {
  opportunityId: Int!
  version: Int!
  title: String!
  description: String!
  exceptions: String   # documentation only — never a bypass for FinalResponseReadiness
  preparedBy: String!
  generatedAt: String!
  status: FinalResponseStatus!
}

input GenerateFinalResponseInput {
  title: String!
  description: String!
  exceptions: String
}

# Question Organization (Stage 6). Deleting a section unsets sectionId on its
# questions — it never deletes them.
type RfpSection {
  id: Int!
  opportunityId: Int!
  name: String!
  description: String
  displayOrder: Int!
  ownerId: Int         # a user id
  dueDate: String
}

input CreateRfpSectionInput {
  opportunityId: Int!
  name: String!
  description: String
  displayOrder: Int!
  ownerId: Int
  dueDate: String
  createdBy: Int
}

input UpdateRfpSectionInput {
  name: String
  description: String
  displayOrder: Int
  ownerId: Int
  dueDate: String
  updatedBy: Int
}

# Metadata only, matching the same pattern already used for the RFP's own
# solicitation document (see the Stage 1 field-gap contract notes) — no real
# upload/storage backend exists yet, so this never carries file bytes.
type UploadedDocument {
  fileName: String!
  fileSizeLabel: String!
  uploadedAt: String
  status: String # "Ready" | "Processing" | "Failed"
}

input UploadedDocumentInput {
  fileName: String!
  fileSizeLabel: String!
}

type RfpQuestionItem {
  id: Int!
  opportunityId: Int!
  number: Int!
  questionText: String!
  type: QuestionType!
  category: String!
  sectionId: Int              # FK to RfpSection.id; null = "Unsectioned"
  mandatory: Boolean!
  priority: String!           # "High" | "Medium" | "Low" — reuses the same values as Opportunity.priority
  source: QuestionSource!
  sourceQuestionId: Int       # set when source = GENERIC_MASTER; FK to the admin service's RfpQuestion.id
  sourceDocument: String      # set when source = AI_EXTRACTED
  sourcePage: Int
  aiConfidence: Int           # 0–100, set when source = AI_EXTRACTED
  reviewStatus: ReviewStatus! # always starts UNDER_REVIEW — no source is auto-approved, including GENERIC_MASTER
  reviewerNotes: String
  assigneeId: Int             # a user id
  reviewerId: Int             # a user id
  dueDate: String
  assignmentNotes: String
  assignmentStatus: AssignmentStatus! # always starts UNASSIGNED
  # Stages 8-9. answerOptions configures Single/Multi Select's picker;
  # answerValues is Multi Select only; every other text-like type (including
  # Structured Table's simplified fallback) uses answerValue; answerDocument
  # is the answer itself when type = FILE_ATTACHMENT. supportingEvidence is
  # separate — optional additional evidence for any type, not the answer.
  # answererNotes is the assignee's own working notes, distinct from
  # reviewerNotes above (a comment on the question itself) and from
  # answerReviewComment/reworkReason below (the reviewer's decision).
  answerOptions: [String!]
  answerValue: String
  answerValues: [String!]
  answerDocument: UploadedDocument
  supportingEvidence: UploadedDocument
  answererNotes: String
  answerStatus: AnswerStatus! # always starts NOT_STARTED
  answerVersion: Int!         # increments only when a REWORK_REQUIRED answer is resubmitted
  answerReviewComment: String
  reworkReason: String        # required (enforced by the resolver) when reviewAnswerItem's decision is REWORK_REQUIRED
  withdrawn: Boolean!         # soft delete, same convention as the Master's isActive/Deactivate — never hard-deleted
  createdDt: String
  updatedDt: String
}

input CreateRfpQuestionItemInput {
  opportunityId: Int!
  questionText: String!
  type: QuestionType!
  category: String!
  sectionId: Int
  mandatory: Boolean!
  priority: String!
  source: QuestionSource!
  sourceQuestionId: Int
  sourceDocument: String
  sourcePage: Int
  aiConfidence: Int
  reviewerNotes: String
  createdBy: Int
}

input UpdateRfpQuestionItemInput {
  questionText: String
  type: QuestionType
  category: String
  sectionId: Int
  mandatory: Boolean
  priority: String
  reviewStatus: ReviewStatus
  reviewerNotes: String
  updatedBy: Int
}

input AssignmentInput {
  assigneeId: Int
  reviewerId: Int
  dueDate: String
  notes: String
  updatedBy: Int
}

input AnswerDraftInput {
  answerValue: String
  answerValues: [String!]
  answerDocument: UploadedDocumentInput
  supportingEvidence: UploadedDocumentInput
  answererNotes: String
  updatedBy: Int
}
```

## Proposed operations

| Operation | Arguments | Returns | Rules |
|---|---|---|---|
| `rfpQuestionItems` (Q) | `opportunityId: Int!` | `[RfpQuestionItem!]!` | Returns every question for the RFP, **including withdrawn ones** — the frontend filters `withdrawn` client-side (same pattern as the Master's `isActive`), so history stays visible via a future "show withdrawn" toggle without a separate query |
| `createRfpQuestionItem` (M) | `input: CreateRfpQuestionItemInput!` | `RfpQuestionItem!` | `number` is server-assigned (max existing `number` for that `opportunityId`, + 1) — not client-supplied, to avoid collisions from concurrent adds. `reviewStatus` is always set to `UNDER_REVIEW` server-side regardless of what's requested |
| `addRfpQuestionItemsFromMaster` (M) | `opportunityId: Int!`, `questionIds: [Int!]!` | `[RfpQuestionItem!]!` | Bulk-creates one `RfpQuestionItem` per given Master `RfpQuestion.id`, with `source: GENERIC_MASTER`, `sourceQuestionId` set, and `reviewStatus: UNDER_REVIEW`. Should reject (or silently skip, backend's call) ids already added to this `opportunityId` — the frontend already disables already-added rows in its own selection dialog, but this must not be client-trusted only |
| `updateRfpQuestionItem` (M) | `id: Int!`, `input: UpdateRfpQuestionItemInput!` | `RfpQuestionItem!` | Powers Edit (Change Category/Section/Type, Mark Mandatory, reviewer Comment) in one call |
| `bulkUpdateRfpQuestionItems` (M) | `ids: [Int!]!`, `input: UpdateRfpQuestionItemInput!` | `[RfpQuestionItem!]!` | Same patch applied to every id — used for bulk Move to Section and bulk Mark Mandatory/Optional |
| `withdrawRfpQuestionItem` (M) | `id: Int!` | `RfpQuestionItem!` | Sets `withdrawn: true`. Never deletes the row |
| `rfpSections` (Q) | `opportunityId: Int!` | `[RfpSection!]!` | Ordered by `displayOrder` |
| `createRfpSection` (M) | `input: CreateRfpSectionInput!` | `RfpSection!` | — |
| `updateRfpSection` (M) | `id: Int!`, `input: UpdateRfpSectionInput!` | `RfpSection!` | Also used for reordering: swap two sections' `displayOrder` in two calls (or add a dedicated `reorderRfpSections` batch mutation if the backend prefers one round trip) |
| `deleteRfpSection` (M) | `id: Int!` | `Boolean!` | Must unset `sectionId` on every question that referenced it **in the same transaction** — never delete those questions |
| `assignRfpQuestionItem` (M) | `id: Int!`, `input: AssignmentInput!` | `RfpQuestionItem!` | Sets `assignmentStatus` to `ASSIGNED` if it was `UNASSIGNED`, or `REASSIGNED` otherwise. Should reject a `dueDate` after the owning RFP's `solicitation.submissionDeadline` when one is set (the frontend already blocks this client-side, but it must not be client-trusted only) |
| `bulkAssignRfpQuestionItems` (M) | `ids: [Int!]!`, `input: AssignmentInput!` | `[RfpQuestionItem!]!` | Same assignment applied to every id, same `ASSIGNED`/`REASSIGNED` rule per question |
| `saveAnswerDraft` (M) | `id: Int!`, `input: AnswerDraftInput!` | `RfpQuestionItem!` | Patches the answer fields. Server sets `answerStatus` to `IN_PROGRESS` only if it's currently `NOT_STARTED` — a draft save must never silently overwrite `SUBMITTED`/`APPROVED`/`REWORK_REQUIRED` |
| `submitAnswerItem` (M) | `id: Int!` | `RfpQuestionItem!` | Refuses (client-facing error, not a silent no-op) if `mandatory` is true and there is no `answerValue`/`answerValues`/`answerDocument`. Sets `answerStatus: SUBMITTED`; if the previous status was `REWORK_REQUIRED`, also increments `answerVersion` |
| `reviewAnswerItem` (M) | `id: Int!`, `decision: AnswerStatus!` (`APPROVED` or `REWORK_REQUIRED` only), `comment: String`, `reworkReason: String` | `RfpQuestionItem!` | `reworkReason` is **required** when `decision = REWORK_REQUIRED` — reject the mutation if it's missing, don't default it. Sets `answerStatus` to the decision |
| `finalResponseReadiness` (Q) | `opportunityId: Int!` | `FinalResponseReadiness!` | Computed live from the opportunity's active (non-withdrawn) `RfpQuestionItem`s: every mandatory question has an answer AND is `APPROVED`, no active question is `UNASSIGNED`, none is `REWORK_REQUIRED`. Each failing condition contributes one human-readable string to `blockingIssues` |
| `generateFinalResponse` (M) | `opportunityId: Int!`, `input: GenerateFinalResponseInput!` | `FinalResponse!` | **Must recompute `finalResponseReadiness` itself and refuse (client-facing error) if not ready — never trust that the UI already checked.** `exceptions` is documentation only, never a way to bypass the check. Increments `version` (starting at 1) on every successful call, including regeneration. Sets `status: GENERATED`, `preparedBy` from the signed-in user, `generatedAt: now` |
| `sendFinalResponseForApproval` (M) | `opportunityId: Int!` | `FinalResponse!` | Only valid when the current status is `GENERATED`. Sets `status: SENT_FOR_APPROVAL`. Hands off to Final Approval (Stage 12) — not specified in this document yet |

`createdBy`/`updatedBy` should follow the same convention as every other service in this repo (see the top of `GRAPHQL_API.md`): optional, recorded from the signed-in user's token when present.

## Example payloads

```graphql
query {
  rfpQuestionItems(opportunityId: 42) {
    id number questionText type category sectionId mandatory priority
    source sourceQuestionId sourceDocument sourcePage aiConfidence
    reviewStatus reviewerNotes assigneeId reviewerId dueDate assignmentStatus
    answerValue answerValues answerStatus answerVersion answerReviewComment reworkReason withdrawn
  }
}

mutation {
  createRfpQuestionItem(input: {
    opportunityId: 42
    questionText: "Describe your approach to data security and compliance."
    type: LONG_TEXT
    category: "Technical"
    mandatory: false
    priority: "Medium"
    source: MANUAL
  }) {
    id number reviewStatus assignmentStatus
  }
}

mutation {
  addRfpQuestionItemsFromMaster(opportunityId: 42, questionIds: [3, 7, 12]) {
    id number sourceQuestionId reviewStatus
  }
}

mutation {
  updateRfpQuestionItem(id: 101, input: { sectionId: 7, mandatory: true }) {
    id sectionId mandatory
  }
}

mutation {
  bulkUpdateRfpQuestionItems(ids: [101, 102, 103], input: { sectionId: 7 }) {
    id sectionId
  }
}

mutation {
  withdrawRfpQuestionItem(id: 104) {
    id withdrawn
  }
}

mutation {
  createRfpSection(input: { opportunityId: 42, name: "Technical Approach", displayOrder: 1 }) {
    id name displayOrder
  }
}

mutation {
  deleteRfpSection(id: 7)
}

mutation {
  assignRfpQuestionItem(id: 101, input: { assigneeId: 4, reviewerId: 9, dueDate: "2026-03-01" }) {
    id assigneeId reviewerId dueDate assignmentStatus
  }
}

mutation {
  bulkAssignRfpQuestionItems(ids: [102, 103], input: { assigneeId: 4 }) {
    id assigneeId assignmentStatus
  }
}

mutation {
  saveAnswerDraft(id: 101, input: { answerValue: "Our methodology follows a phased rollout..." }) {
    id answerStatus answerValue
  }
}

mutation {
  submitAnswerItem(id: 101) {
    id answerStatus answerVersion
  }
}

mutation {
  reviewAnswerItem(id: 101, decision: REWORK_REQUIRED, comment: "Missing cost breakdown", reworkReason: "Add a detailed cost table") {
    id answerStatus reworkReason
  }
}

mutation {
  reviewAnswerItem(id: 101, decision: APPROVED, comment: "Looks good") {
    id answerStatus
  }
}

query {
  finalResponseReadiness(opportunityId: 42) {
    ready
    blockingIssues
  }
}

mutation {
  generateFinalResponse(opportunityId: 42, input: { title: "State DOT — Final Response", description: "..." }) {
    version status preparedBy generatedAt
  }
}

mutation {
  sendFinalResponseForApproval(opportunityId: 42) {
    status
  }
}
```

## Suggested tables (illustrative — final naming is the backend team's call)

```sql
CREATE TABLE trn_rfp_sections (
  id SERIAL PRIMARY KEY,
  opportunity_id INTEGER NOT NULL,
  name VARCHAR(255) NOT NULL,
  description VARCHAR(2000),
  display_order INTEGER NOT NULL,
  owner_id INTEGER,
  due_date DATE,
  created_dt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER,
  updated_dt TIMESTAMP,
  updated_by INTEGER
);
CREATE INDEX ix_rfp_sections_opportunity ON trn_rfp_sections (opportunity_id);

CREATE TABLE trn_rfp_question_items (
  id SERIAL PRIMARY KEY,
  opportunity_id INTEGER NOT NULL,
  number INTEGER NOT NULL,
  question_text VARCHAR(2000) NOT NULL,
  type VARCHAR(30) NOT NULL,
  category VARCHAR(100) NOT NULL,
  section_id INTEGER REFERENCES trn_rfp_sections(id),
  mandatory BOOLEAN NOT NULL DEFAULT FALSE,
  priority VARCHAR(20) NOT NULL,
  source VARCHAR(20) NOT NULL,
  source_question_id INTEGER,   -- FK to admin service's mst_rfp_questions.question_id (cross-service, enforced in code not DB)
  source_document VARCHAR(500),
  source_page INTEGER,
  ai_confidence INTEGER,
  review_status VARCHAR(20) NOT NULL DEFAULT 'UNDER_REVIEW',
  reviewer_notes VARCHAR(2000),
  assignee_id INTEGER,
  reviewer_id INTEGER,
  due_date DATE,
  assignment_notes VARCHAR(2000),
  assignment_status VARCHAR(20) NOT NULL DEFAULT 'UNASSIGNED',
  answer_options TEXT[],          -- or a separate child table, backend's call
  answer_value VARCHAR(4000),
  answer_values TEXT[],
  answer_document_name VARCHAR(500),   -- metadata only, same as UploadedDocument elsewhere — no file bytes
  answer_document_size VARCHAR(50),
  supporting_evidence_name VARCHAR(500),
  supporting_evidence_size VARCHAR(50),
  answerer_notes VARCHAR(2000),
  answer_status VARCHAR(20) NOT NULL DEFAULT 'NOT_STARTED',
  answer_version INTEGER NOT NULL DEFAULT 0,
  answer_review_comment VARCHAR(2000),
  rework_reason VARCHAR(2000),
  withdrawn BOOLEAN NOT NULL DEFAULT FALSE,
  created_dt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER,
  updated_dt TIMESTAMP,
  updated_by INTEGER
);
CREATE INDEX ix_rfp_question_items_opportunity ON trn_rfp_question_items (opportunity_id);
CREATE INDEX ix_rfp_question_items_section ON trn_rfp_question_items (section_id);

CREATE TABLE trn_final_responses (
  opportunity_id INTEGER PRIMARY KEY,  -- one row per opportunity; generateFinalResponse upserts it
  version INTEGER NOT NULL DEFAULT 0,
  title VARCHAR(500) NOT NULL,
  description VARCHAR(4000) NOT NULL,
  exceptions VARCHAR(2000),
  prepared_by VARCHAR(255) NOT NULL,
  generated_dt TIMESTAMP NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'GENERATED'
);
```

## Not covered by this document (future phases, per the UI coverage audit)

Progress Dashboard (Stage 10), Final Approval (Stage 12), Submission (Stage 13), Client Q&A (Stage 14), Closure (Stage 15), and structured Activity/Audit history (Stage 16 — the mock UI currently repurposes a generic, opportunity-level history log for assignment, answer-review and final-response events, not exposed as its own query here) are separate, later phases and are **not** in the scope of this contract. Question Organization (Sections), Assignment, the Answer Workspace, Internal Review, and Final Response, previously listed here as not-covered, are now included above.
