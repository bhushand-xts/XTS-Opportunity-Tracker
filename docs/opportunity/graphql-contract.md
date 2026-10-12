# Opportunity GraphQL handoff

## Status and activation

**Proposed, not live.** The gateway uses one configured GraphQL endpoint and the
shared Apollo Bearer transport. The inspected live schema does not expose an
Opportunity type, client directory or workflow operations. Do not deploy the
proposed SDL or enable the adapter without backend authorization and integration
verification. Existing opportunityList/proposalSectionsList source repositories
are hardcoded [] stubs, not scoped persistence.

Authoritative proposed schema: `contracts/opportunity-workflow.proposed.graphql`.
Exhaustive operation documents: `contracts/opportunity-workflow.operations.graphql`.
Typed UI contracts: `frontend/packages/@xts/api-contracts/src/opportunity.ts`.
Optional Apollo adapter: `frontend/packages/@xts/mfe-opportunity/src/services/proposed/createWorkflowService.ts`.
The default `productionOpportunityService` connects implemented lookup reads
and returns INTEGRATION_UNAVAILABLE for workflow capabilities. Intake also reads
Question Master templates and the user-authorized active Opportunity owner
directory through shared Apollo hooks. The production service never imports
the optional adapter or silently substitutes mocks after a network error. Tests
and the isolated visual harness inject their own service through context.

When the backend is ready, provide `createWorkflowService(getApolloClient())`
through OpportunityServiceContext. Validate schema and integration tests first.
No form/review component changes should be needed. Existing master schemas are
reused; the proposed type names use Workflow prefixes to avoid id-only legacy
Opportunity/proposalSections types. The standalone proposed schema uses Query and
Mutation root definitions for validation; compose as extensions in the service.
No existing codegen pipeline was found; this follows the repository's manual
TypeScript API contract plus gql-document conventions.

## Identity, authorization and redaction (every operation)

Authenticate the Bearer token through the gateway; derive the actor from the
verified gateway identity, never from a supplied actor ID. Reject unauthenticated
calls. Apply tenant/organization scope and active-user membership before any
entity lookup. Reject direct-service requests without trusted verified identity;
do not copy the admin service's supplied-actor fallback into workflow code.

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
must separately check record scope, active assignment and lifecycle. There is no
role-name matching or Admin/Super Admin approval exemption. Business action enums
in this contract are computed capabilities, not new assumed database permission
codes. Map them to actual menu grants plus assignments on the server.

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
| PREPARATION_PENDING | Pending | Preparation only, never Sales Head review |
| IN_PROGRESS | In progress | Preparation/assigned response work |
| SALES_REVIEW | Sales Head review | Submitted immutable package, assigned sales reviewer |
| GATE1_PENDING | Gate 1 pending | Sales-approved same package, assigned CEO/Approver |
| GATE1_GO | Gate 1 Go | Final Gate 1 Go, retained history |
| SALES_REJECTED | Rejected by Sales Head | Retained, never automatically advances |
| GATE1_NO_GO | Closed ? No-Go | Final negative decision, retained history |

The Sales Head reference's Pending is **SALES_REVIEW**, not PREPARATION_PENDING.
Form saves do not accept state. Creates return PREPARATION_PENDING. Updating a
record preserves its current state unless an explicit workflow command transitions
it. The backend, not the UI, chooses transition effects.

Response lifecycle: UNASSIGNED ? ASSIGNED ? DRAFT ? SUBMITTED ? APPROVED or
CHANGES_REQUESTED. Only an active assigned owner can save/submit. Only an active
assigned independent reviewer can approve or request changes. Require a reason
for CHANGES_REQUESTED. Increment answer revision on changed saved drafts; record
submittedRevision on submission and approvedRevision on approval. Resubmission
must identify the revised answer version. Changing question text, selected section
instructions, assignment, answer or relevant intake invalidates only affected
response approvals; unchanged responses retain their approvals. Package approvals
are tied to an immutable packageRevision. Do not approve a mutable live draft.

OpportunityWorkspace mode WORK returns editable current preparation; DETAILS
returns current saved authorized summaries; REVIEW returns the immutable submitted
package under review, its decision actions and revision. Decisions atomically
verify current opportunity revision, assigned reviewer/approver, package revision,
prior decision state and all required package prerequisites.

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

| Operation | Purpose/input ? output | Scope, validation and revision rules |
|---|---|---|
| OpportunityWorkflowActions | No inputs ? computed global WorkflowAction list | Authenticated tenant-scoped capabilities; client directory creation is separately authorized, never implied by opportunity add. Missing production capability API defaults to no actions. |
| OpportunityWorkflowPage | WorkflowListInput(search, queue, after, first) ? cursor page of summaries | User-scoped opportunities; view grant; first 1..100; search reference/title/client. MY_WORK only assigned actionable preparation/responses; MY_APPROVALS only assigned submitted eligible packages. Never return draft Pending as Sales-review queue item. |
| OpportunityWorkspace | id + mode(WORK/DETAILS/REVIEW) ? authorized workspace | Scope before lookup; visibleModules/redaction; REVIEW immutable snapshot. Returned readiness is authoritative. |
| ClientDirectoryPage | keywords + cursor + first ? scoped client page with contacts | Directory view scope, debounce/stale request cancellation in UI; useful identifying company/contact/email/location info; no fake no-result fallback. |
| EligibleOpportunityUsers | opportunityId?, purpose, search, cursor, first ? scoped user page | Active actual eligibility for OWNER/REVIEWER/SALES_REVIEWER/GATE1_APPROVER; multiple roles; keep inactive currently assigned user in record output but exclude from eligible choices. |
| SaveOpportunityClient | id?, expectedRevision?, idempotencyKey, ClientDraft ? persisted client | Explicit create/update permission; validate required directory/contact fields; update shared client only in this operation; contact IDs/ownership server-managed. |
| SaveOpportunityWorkflow | id?, expectedRevision?, idempotencyKey, complete form ? workspace | add for create / edit+preparation record action for update. Pending requires name/value/currency/service line/owner/client; shared solicitation/dates and unselected RFP may be incomplete. Validate provided nonempty URLs/email/date values; never reset state on update. Questions/sections saved atomically with form, affected approvals invalidated only. |
| UploadOpportunitySource | record version + filename/mime/contentBase64 ? stored document | UPLOAD action; tenant-owned file, content sniffing, size limit, malware scanning, private storage; return stable ID/name and authorized download URL if available. This proposed transport needs gateway body-size/streaming decisions before implementation (current express.json default is insufficient for 25 MB); a presigned/multipart contract may be substituted behind the upload adapter after agreement. |
| StartOpportunityExtraction | record version + documentId ? workspace with extraction job | EXTRACT action, source ownership, saved source linked, async processing, idempotent job creation. Never return sample questions as extraction. |
| OpportunityExtractionStatus | opportunityId + jobId ? authorized workspace | Processing/success/failure; successful extracted questions include source references and unvalidated source state. UI polls with cancellation; retry is explicit. |
| SaveOpportunityEstimation | record version + estimation revision/matrix/assumptions ? workspace | EDIT_ESTIMATION action, preparation stage; validate decimals/positive integer people and recalculate totals; no separate estimation approval gate. |
| SaveOpportunityScope | record version + scope revision/text ? workspace | EDIT_SCOPE action, preparation stage; increment revision and expose saved summary only. |
| AssignOpportunityResponse | record/response versions + active owner/reviewer IDs + dueDate ? workspace | ASSIGN action, preparation stage, independent eligible users, tenant-safe lookup; update affected approval/draft ownership atomically. |
| SaveOpportunityAnswer | record/response versions + answer + submit boolean ? workspace | Owner-only action; draft saves separate from form. Nonempty on submission; revision lifecycle; a generic section uses the same response model. |
| ReviewOpportunityAnswer | record/response/submitted versions + approved + reason ? workspace | Independent reviewer-only action; reason required if false; exact current submitted version; approval of own answer forbidden. |
| SubmitOpportunitySalesReview | record version + salesReviewerId + gate1ApproverId ? submitted workspace | SUBMIT_SALES action; stricter readiness incl approved current responses, solicitation/issuing agency/destination/deadline, eligible decision owners; create immutable snapshot and increment packageRevision; enter SALES_REVIEW, not final Go. |
| DecideOpportunityPackage | record version + packageRevision + decision + reason + confirmed ? workspace | Assigned decision owner + approve/reject grant + stage. SALES_APPROVE ? GATE1_PENDING; SALES_REJECT ? SALES_REJECTED; GATE1_GO ? GATE1_GO; GATE1_NO_GO ? GATE1_NO_GO. Require confirmed true and rejection/No-Go reason. Atomically write history/next responsibility and consume decision eligibility. |

## Cache and updates

Existing master reads use the shared Apollo client with network-only lookup fetches.
The proposed adapter uses network-only paginated/detail reads and evicts only
opportunity page/workspace/extraction projections after successful mutations;
client save also evicts client directory pages. Components consume authoritative
mutation workspace results immediately; navigation to Pipeline loads a new list.
There is no optimistic business status or local database. All queues/counts must
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
