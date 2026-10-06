# Proposal Outline (Generic RFP path) — GraphQL contract (PROPOSED, not implemented yet)

Everything in this document is a **proposal for the backend team to implement**, not a description of running code. The frontend (`frontend/packages/@xts/mfe-opportunity/src/features/proposal-outline/`) is built against a mock, in-memory store today — see `proposalSection.mockHooks.ts`, whose hooks are shaped like the real Apollo `useQuery`/`useMutation` calls below so swapping to a real backend only means replacing each hook's body.

**Where this plugs in:** `backend/services/opportunity` (port 4003) — the same service already extended by `backend/docs/RFP_QUESTION_WORKFLOW_CONTRACT.md` and `backend/docs/CUSTOMER_MASTER_CONTRACT.md`.

**Relationship to RFP Questions:** a `ProposalSection` is **not** an `RfpQuestionItem` relabeled — it's the Generic RFP path's own, simpler concept (no mandatory flag, priority, source, reviewer, or multi-stage review loop; just a title, drafted content, one owner, and a status). The two paths are mutually exclusive per opportunity (`Opportunity.rfpType` decides which one applies) and are intentionally kept as separate domain types.

**Not covered here:** compiling the final set of approved ("Final") sections into an actual downloadable proposal document is a separate concern, not yet specified (the Questionnaire path's equivalent — Final Response — isn't mirrored here yet either).

---

## Proposed types

```graphql
enum ProposalSectionStatus {
  NOT_STARTED
  ASSIGNED
  DRAFTING
  FINAL
}

type ProposalSection {
  id: Int!
  opportunityId: Int!
  number: Int!
  title: String!
  volume: String!      # free text, e.g. "Technical volume" | "Cost volume" — not a closed enum
  content: String
  assigneeId: Int       # a user id
  status: ProposalSectionStatus!
  withdrawn: Boolean!   # soft delete, same convention used everywhere else in this app
  createdDt: String
  updatedDt: String
}

input CreateProposalSectionInput {
  opportunityId: Int!
  title: String!
  volume: String!
  createdBy: Int
}

input UpdateProposalSectionInput {
  title: String
  volume: String
  content: String
  assigneeId: Int
  status: ProposalSectionStatus
  updatedBy: Int
}
```

## Proposed operations

| Operation | Arguments | Returns | Rules |
|---|---|---|---|
| `proposalSections` (Q) | `opportunityId: Int!` | `[ProposalSection!]!` | Returns every section **including withdrawn ones** (frontend filters client-side, same pattern as `RfpQuestionItem.withdrawn`) |
| `createProposalSection` (M) | `input: CreateProposalSectionInput!` | `ProposalSection!` | `number` is server-assigned (max existing + 1), `status` always starts `NOT_STARTED` |
| `addProposalSectionsFromRequirements` (M) | `opportunityId: Int!`, `titles: [String!]!` | `[ProposalSection!]!` | Bulk-seeds one section per title from the intake form's required-sections checklist. Server decides `volume` the same way the frontend currently does (title contains "Pricing"/"Commercial" → `"Cost volume"`, else `"Technical volume"`) — or takes an explicit `volume` per title if the backend team prefers not to duplicate that heuristic |
| `updateProposalSection` (M) | `id: Int!`, `input: UpdateProposalSectionInput!` | `ProposalSection!` | One generic patch — covers content edits, reassignment, and status changes. `status` is a **plain, directly-settable field**, not state-machine-enforced — there's no formal review/rework loop on this path |
| `withdrawProposalSection` (M) | `id: Int!` | `ProposalSection!` | Sets `withdrawn: true`. Never deletes the row |

`createdBy`/`updatedBy` follow the same convention as every other service in this repo.

## Example payloads

```graphql
query {
  proposalSections(opportunityId: 42) {
    id number title volume content assigneeId status withdrawn
  }
}

mutation {
  addProposalSectionsFromRequirements(
    opportunityId: 42
    titles: ["Executive summary", "Technical approach & solution", "Pricing & commercials"]
  ) {
    id number title volume status
  }
}

mutation {
  updateProposalSection(id: 7, input: { content: "Our approach follows a phased rollout...", status: DRAFTING }) {
    id status content
  }
}

mutation {
  updateProposalSection(id: 7, input: { assigneeId: 4 }) {
    id assigneeId
  }
}

mutation {
  withdrawProposalSection(id: 9) {
    id withdrawn
  }
}
```

## Suggested table (illustrative — final naming is the backend team's call)

```sql
CREATE TABLE trn_proposal_sections (
  id SERIAL PRIMARY KEY,
  opportunity_id INTEGER NOT NULL,
  number INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL,
  volume VARCHAR(100) NOT NULL,
  content VARCHAR(8000),
  assignee_id INTEGER,
  status VARCHAR(20) NOT NULL DEFAULT 'NOT_STARTED',
  withdrawn BOOLEAN NOT NULL DEFAULT FALSE,
  created_dt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER,
  updated_dt TIMESTAMP,
  updated_by INTEGER
);
CREATE INDEX ix_proposal_sections_opportunity ON trn_proposal_sections (opportunity_id);
```

## Not covered by this document

Compiling a final downloadable proposal document from approved sections (the equivalent of the Questionnaire path's Final Response), any review/approval workflow on proposal content, and Submission/Client Q&A/Closure for the Generic path are **not** in scope here.
