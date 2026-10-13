# Opportunity GraphQL handoff

## Current status

Frontend only. Backend source changes from the attempted real-workflow implementation
were reverted; no database migration or business mutation was applied. The unchanged
Opportunity service remains an id-only stub and does not implement workflow APIs.

The normal MFE uses the real Apollo adapter and signed-in user's Bearer session by
default. `OPPORTUNITY_USE_LOCAL_WORKFLOW=false` selects backend workflow persistence.
No separate workflow API flag is required. Restart the frontend dev servers after
changing the environment. API failures remain visible and never activate mocks.

Development-only `OPPORTUNITY_USE_LOCAL_WORKFLOW=true` uses the same screens with
browser-local workflow records and actual logged-in users. There is no actor
switcher or session override. Existing gateway identity, user/role directory,
Opportunity menu grants and master queries remain live. Sign out/in on the same
browser profile and app origin to test Sales Representative -> Sales Head -> CEO.
This mode validates frontend behavior; cross-device persistence and backend
authorization still require the contract below. Production always uses the API.

The contract schema below is a backend handoff, not a deployed implementation:
`contracts/opportunity-workflow.proposed.graphql`; operations are in
`contracts/opportunity-workflow.operations.graphql`. Confirm six queries and ten
mutations, backend-computed actions/modules, database persistence, revision checks,
package snapshots and automatic real-user routing before end-to-end testing.

Expected flow: Save -> Pending -> eligible Sales Head users -> Sales approval ->
eligible CEO users -> Go / No-Go. `approvalAssignees` must contain actual active
assigned users. Multiple eligible users form a stage queue; the first valid decision
advances the package atomically. One named assignee per stage can instead be configured
by the backend. The frontend never selects arbitrary IDs or creates real assignments.
Existing login, menus, master data, user/role directory and Question Master reads are
already connected. Real workflow persistence and cross-user queues remain backend work.

## Identity, authorization and redaction (every operation)

Backend requirement: verify the real session, active user/role, current Opportunity
menu grants, stored stage assignment and exact package/revision on every operation.
A caller-supplied identity or frontend role name must not authorize a mutation.
Restricted workspace values must be redacted by the backend. The existing gateway
forwards a verified user ID; the Opportunity stub does not enforce workflow rules yet.

Discover Opportunity records with `menus(asTree: false)` and use the actual
menuKeys and exact configured grants of all matching active records. Exclude
incompatible module routes; do not authorize through a fixed menu ID or key.
The local active records are 12 / Opportunities (`opportunities`) and
29 / Opportunity Management (`opportunity_management`, `/opportunities`).
Inactive 28 / Opportunity Tracking and Administration's 5 / Permission Master
are excluded. The canonical UI route is `/opportunity`, with `/opportunities`
supported as an alias. Existing
verified codes include view/add/edit/approve/reject; global create requires add,
view/work requires view, approvals queue requires approve OR reject. The server
must separately check record scope, active assignment and lifecycle. Frontend role
labels do not grant access, and there is no Admin/Super Admin approval exemption. Business action enums
in this contract are computed capabilities, not new assumed database permission
codes. Map them to actual menu grants plus assignments on the server.

Routing defaults to active eligible users of configured role codes `SH` (Sales
Head) and `approver_gate2` (CEO). Both require actual Opportunity view and approve/
reject grants; stored assignment plus current eligibility and stage determine
decision actions. `SALES_HEAD_ROLE_CODE` and `CEO_ROLE_CODE` override routing codes.
Optional positive-integer `SALES_HEAD_USER_ID` and `GATE1_CEO_USER_ID` restrict a
queue to an eligible real user. Without filters, all eligible users receive the
queue and the first valid transactional decision wins. `approvalAssignees` returns
that active group; `responsible` is null for multiple assignees rather than selecting
an arbitrary person.

Return `visibleModules` and `allowedActions` on each record, and per-response
allowedActions. Reject forbidden fields at the resolver layer or return null for
restricted projection fields, without querying restricted datasets internally.
A restricted estimation must be null on workspace/Overview/review, not just
hidden by a tab. Apply the same policy to responses, scope and activity. Access
must be rechecked for each operation even if a client received a capability earlier.
No eligibleUser query may expose users across tenants. Eligibility must use actual
active-user permissions/roles and support multiple roles in the contract; the
current user table has one role, which is a backend migration/integration gap.
The intake owner selector currently reads active `userList` records and uses
`rolesList` for role display at the user's request. Preserve an inactive current
owner for display, but offer active users for new selection. These directory reads
do not replace response-owner/reviewer/approver eligibility or authorize through
role names. Validate Opportunity owner assignment and tenant scope on real save.

## IDs, nullability and scalar policy

Stable IDs use GraphQL ID strings. Current master integer IDs are serialized as
strings in the UI and validated against their owning service on save. Do not
replace supplied foreign keys with display labels. New draft questions/estimate
rows have temporary draft-UUID IDs: atomically reconcile to stable server IDs and
return the authoritative form; preserve existing stable IDs.
Question Master imports separately retain optional numeric `masterQuestionId`
(nullable `Int` in the proposed question input/output), an existing
`rfpQuestionsList` identity. Validate that reference on save. Each import creates
an independent editable question with a unique draft ID,
`sourceReference: Question Master #id` and `validated: false`; duplicate master
imports are suppressed. Importing/editing a copy never updates the shared master
and does not establish extraction, response completion or source validation.

All output lists are non-null where implemented; detail-sensitive datasets are
nullable for redaction. Client/source/owner/responsible may be null if missing.
Empty draft text/date strings are deliberate for Pending records; nonempty dates
must be YYYY-MM-DD calendar-valid and stored as date-only values. Timestamp strings
(activity.at) must be timezone-aware ISO instants. Submission timezone is a separate
IANA value. Do not convert date-only values via Date/UTC midnight. Decimal strings
are required for values, rates, hours and totals; recompute estimation row amounts
and totals on the server, never trust a submitted total. The agreed initial
calculation rounds each row to 2 decimals and sums those amounts.

## State and snapshot rules

| Domain state | UI label | Queue eligibility |
|---|---|---|
| PREPARATION_PENDING | Legacy preparation state | Retained enum compatibility; new saves enter SALES_REVIEW |
| IN_PROGRESS | Legacy preparation state | Retained enum compatibility; response work does not move a new record out of Pending |
| SALES_REVIEW | Pending | Saved package immediately assigned to configured Sales Head and visible in My approvals |
| GATE1_PENDING | Gate 1 pending | Sales-approved same package, assigned CEO/Approver |
| GATE1_GO | Gate 1 Go | Final Gate 1 Go, retained history |
| SALES_REJECTED | Rejected by Sales Head | Retained, never automatically advances |
| GATE1_NO_GO | Closed ? No-Go | Final negative decision, retained history |

The current flow is **Save -> Pending -> Sales Head approval -> Gate 1 pending ->
CEO Go / No-Go**. Pending is `SALES_REVIEW`. `saveOpportunityWorkflow` performs one
atomic transaction: validate the required intake fields, persist the form, resolve
configured active Sales Head and CEO assignments server-side, create/version the
saved package, and return Pending with Sales Head as `responsible`. No separate
submission mutation, approver picker, frontend user-ID constant or prerequisite
answer approval is used. Missing/invalid approver configuration fails the operation
without a partially saved/routed record.

The owner may edit while Pending if allowed by actual grants and record scope.
Each saved change refreshes opportunity/package revisions and the pending package;
an approval using an older revision must fail. Form inputs still do not accept state
or approver IDs. Sales approval is one atomic decision that records its history,
sets `GATE1_PENDING` and assigns the configured CEO; no follow-up assignment request
is required. Sales rejection retains `SALES_REJECTED` without advancing.

Response lifecycle: UNASSIGNED ? ASSIGNED ? DRAFT ? SUBMITTED ? APPROVED or
CHANGES_REQUESTED. Only an active assigned owner can save/submit. Only an active
assigned independent reviewer can approve or request changes. Require a reason
for CHANGES_REQUESTED. Increment answer revision on changed saved drafts; record
submittedRevision on submission and approvedRevision on approval. Resubmission
must identify the revised answer version. Changing question text, selected section
instructions, assignment, answer or relevant intake invalidates only affected
response approvals; unchanged responses retain their approvals. Source validation,
answer completion and response review remain separate preparation features; none
is a prerequisite for Sales Head/CEO package approval. Package decisions are tied
to the exact saved packageRevision. An owner edit creates a newer package and makes
the previously viewed decision revision stale.

OpportunityWorkspace mode WORK returns permitted current Pending edits; DETAILS
returns current saved authorized summaries. Approver Overview requests mode REVIEW
for the saved package snapshot, revisions and assigned decision actions, even when
its URL ends in `/details`. Sales Head approves directly from Overview. Decisions atomically
verify current opportunity revision, assigned reviewer/approver, package revision,
prior decision state and active configured assignment. `readiness` remains an
advisory preparation field for compatibility; a false value or unvalidated/unfinished
responses must not block creation, Sales approval or CEO Go / No-Go.
The create adapter accepts success only when the server returns `SALES_REVIEW`,
a positive package revision and a nonempty active `approvalAssignees` group. A mismatched routing
result is reported as uncertain saved state with a refresh instruction; it must
not produce a queued-success message or silently retry as a new creation.

## Concurrency, idempotency and errors

All commands include idempotencyKey; record commands include expectedRevision.
Response commands additionally include responseRevision and reviews include the
submittedRevision. Scope/estimation payloads include their saved revision. Transactionally
check these versions before writes. Use an idempotency table scoped to authenticated
actor + tenant + operation. Retrying identical payload/key returns the prior result.
Reusing a key with different payload is IDEMPOTENCY_CONFLICT. Never create two
opportunities or apply two decisions for repeated clicks/retries. Rejected/No-Go
records must not advance by background automation.

GraphQL business errors use extensions.code: UNAUTHENTICATED, FORBIDDEN, NOT_FOUND,
VALIDATION_FAILED (field paths/messages), REVISION_CONFLICT (current revision,
refresh reference), INVALID_TRANSITION, INELIGIBLE_USER, EXTRACTION_FAILED,
IDEMPOTENCY_CONFLICT. No success payload on a failed transaction. The UI retains
drafts, shows errors and requires refreshed comparison for revision conflicts;
it does not silently overwrite newer saved data. Actor IDs/timestamps are output-only.

## Operation requirements

Required query fields are `opportunityWorkflowActions`, `opportunityWorkflowPage`,
`opportunityWorkspace`, `clientDirectoryPage`, `eligibleOpportunityUsers` and
`opportunityExtractionStatus`. Required mutation fields are
`saveOpportunityWorkflow`, `saveOpportunityClient`, `uploadOpportunitySource`,
`startOpportunityExtraction`, `saveOpportunityEstimation`, `saveOpportunityScope`,
`assignOpportunityResponse`, `saveOpportunityAnswer`, `reviewOpportunityAnswer`,
`decideOpportunityPackage`. Full fragments must match the schema; exposed fields
for unsupported integrations return explicit unavailable errors rather than fake
persistence or extraction.

| Operation | Purpose/input ? output | Scope, validation and revision rules |
|---|---|---|
| OpportunityWorkflowActions | No inputs ? computed global WorkflowAction list | Implemented with active real user/role/menu grants; existing Opportunity add grants expose CLIENT_CREATE, and client update requires edit. No frontend role-label bypass. |
| OpportunityWorkflowPage | WorkflowListInput(search, queue, after, first) ? cursor page of summaries | Implemented for users with actual Opportunity view grant; first 1..100; shared-database Pipeline search. MY_WORK contains owned Pending work; MY_APPROVALS contains currently eligible assigned Pending SALES_REVIEW for Sales Head and GATE1_PENDING for CEO. |
| OpportunityWorkspace | id + mode(WORK/DETAILS/REVIEW) ? authorized workspace | Scope before lookup; visibleModules/redaction; current saved package/revisions and authorized Overview decision actions. Readiness is advisory and does not gate package approval. |
| ClientDirectoryPage | keywords + cursor + first ? client page with contacts | Implemented from real shared client/contact data under Opportunity view grant; debounce/stale request cancellation in UI; no fake no-result fallback. |
| EligibleOpportunityUsers | opportunityId?, purpose, search, cursor, first ? scoped user page | Active actual response-owner/reviewer eligibility; multiple roles; preserve inactive current assignments for display. Sales Head/CEO routing is configured server-side and has no frontend selector. |
| SaveOpportunityClient | id?, expectedRevision?, idempotencyKey, ClientDraft ? persisted client | Implemented; existing menu add/edit grants govern create/update. Validate directory/contact fields; update shared client only here. Linked Pending package changes refresh revisions. |
| SaveOpportunityWorkflow | id?, expectedRevision?, idempotencyKey, complete form ? workspace | add for create / edit+owner Pending scope for update. Required name/value/currency/service line/owner/client; solicitation, RFP validation and responses may be incomplete. One atomic save assigns configured approvers, returns SALES_REVIEW displayed Pending with Sales Head responsibility, and versions the saved package. Pending edits refresh revisions; validate supplied URLs/email/dates and invalidate only affected response approvals. No client-supplied approver IDs. |
| UploadOpportunitySource | record version + filename/mime/contentBase64 ? stored document | Not implemented; returns INTEGRATION_UNAVAILABLE. Future transport requires real private storage, ownership/content checks and gateway body-size/streaming support; current defaults cannot handle 25 MB base64 upload. |
| StartOpportunityExtraction | record version + documentId ? workspace with extraction job | Not implemented; returns INTEGRATION_UNAVAILABLE. Future parser needs source ownership, asynchronous processing and idempotency; no sample questions presented as extraction. |
| OpportunityExtractionStatus | opportunityId + jobId ? authorized workspace | Not implemented; returns INTEGRATION_UNAVAILABLE. Processing/status polling remains a future document integration. |
| SaveOpportunityEstimation | record version + estimation revision/matrix/assumptions ? workspace | EDIT_ESTIMATION action, preparation stage; validate decimals/positive integer people and recalculate totals; no separate estimation approval gate. |
| SaveOpportunityScope | record version + scope revision/text ? workspace | EDIT_SCOPE action, preparation stage; increment revision and expose saved summary only. |
| AssignOpportunityResponse | record/response versions + active owner/reviewer IDs + dueDate ? workspace | Not implemented; returns INTEGRATION_UNAVAILABLE. Prepared question/section definitions persist through form save, but this does not persist response assignments. |
| SaveOpportunityAnswer | record/response versions + answer + submit boolean ? workspace | Not implemented; returns INTEGRATION_UNAVAILABLE. Answer draft/submission lifecycle remains a separate future integration. |
| ReviewOpportunityAnswer | record/response/submitted versions + approved + reason ? workspace | Not implemented; returns INTEGRATION_UNAVAILABLE. Independent answer review is not required for current Sales/CEO package approval. |
| DecideOpportunityPackage | record version + packageRevision + decision + reason + confirmed ? workspace | Assigned decision owner + approve/reject grant + current stage/revision. SALES_APPROVE atomically records history, enters GATE1_PENDING and assigns configured CEO; SALES_REJECT enters SALES_REJECTED; GATE1_GO enters GATE1_GO; GATE1_NO_GO enters GATE1_NO_GO. Require reviewed confirmation and rejection/No-Go reason; reject stale or wrong-role decisions. No response-readiness prerequisite or follow-up routing mutation. |

## Cache and updates

Existing master reads use the shared Apollo client with network-only lookup fetches.
The conditional adapter uses network-only paginated/detail reads with explicit
`errorPolicy: none`, rejects partial data accompanied by GraphQL errors, and evicts only
opportunity page/workspace/extraction projections after successful mutations;
client save also evicts client directory pages. Components consume authoritative
mutation workspace results immediately; navigation to Pipeline loads a new list.
In real API mode there is no optimistic business status or local database. All queues/counts must
reflect backend returned records; filtered/page counts are labelled accordingly.
No subscriptions or cross-user live workflow updates are claimed. Auth grants
already refresh every 30 seconds; workflow visibility updates on a new query,
explicit retry/navigation, successful command, or extraction polling.

### Unsaved answer exception to Save Opportunity navigation

Save Opportunity normally returns to Pipeline after persistence. If a separate
answer/assignment draft is still unsaved, the UI keeps the work area open and
announces that the form was saved while the answer remains unsaved. This preserves
work instead of discarding an answer as a side effect of a form save. Save & Continue
always stays. A new opportunity keeps one creation idempotency key across failed
attempts, including edited retries; a server IDEMPOTENCY_CONFLICT requires resolving
the uncertain original save rather than risking a duplicate create.
