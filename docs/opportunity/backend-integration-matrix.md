# Backend integration matrix

Real = verified existing master/directory API. Missing = required backend workflow
operation absent from the unchanged Opportunity service. The frontend uses the real
GraphQL adapter by default. `OPPORTUNITY_USE_LOCAL_WORKFLOW=false` uses actual login
and workflow APIs; failed requests never substitute mock data. Development-only
`OPPORTUNITY_USE_LOCAL_WORKFLOW=true` retains real login/directory/grants/masters
while testing the same screens with browser-local workflow records across logins.
It has no role selector and does not implement any missing backend operation.
No separate workflow API flag is needed. Backend source changes were reverted and
no database changes were applied. Confirm the supplied six-query/ten-mutation contract,
real assignment groups, persistence, actions/redaction and revision/idempotency rules
before real-user end-to-end testing. The same MFE pages need no alternate test flow.

| Screen/action | Adapter method | GraphQL operation | Status | Expected payload | Backend work |
|---|---|---|---|---|---|
| Sidebar/menu guard | shared menu discovery/useAuth | menus(asTree: false), roleAccess(roleId), availablePermissionsForMenu | Real menu metadata verified: active 12 and 29 connected; inactive 28 and Administration menu 5 excluded | matching active menuKey/name/icon/route; actual role grants | Assign permissions to existing active Opportunity records; no fixed ID, duplicate record or database mutation |
| Global directory capabilities | globalActions | OpportunityWorkflowActions | Missing (default denies writes) | Computed action list, including CLIENT_CREATE | Scoped explicit client-create authorization separate from opportunity add |
| Currency/industry/account type fields | lookups | OpportunityLookups ? currencies/industries/accountTypes | Real, reads verified | active stable master IDs/names/codes | Preserve existing master semantics; validate foreign keys on workflow save |
| Opportunity owner | useOwnerDirectory | GetOpportunityOwnerDirectory: userList, rolesList | Real, connected at user's request; 16 active users and 9 active roles verified | stable user ID/active status; role display; retain inactive current owner label | Validate assignment and tenant scope on save; directory roles do not establish approval/reviewer eligibility |
| Add from Question Master | useRfpQuestionTemplates | OpportunityRfpQuestionTemplates: rfpQuestionsList | Real, connected; 5 active templates verified | numeric masterQuestionId; unique draft question ID; independent editable text; sourceReference; validated false | Validate master identity on workflow save; do not update shared master or treat copies as extraction/answers |
| Pipeline/search/Board/List/pagination | list | OpportunityWorkflowPage | Missing | scoped cursor summaries with state/actions | Implement opportunity persistence, scope, filtering and queue projections |
| My Work/My Approvals | list(queue) | OpportunityWorkflowPage | Missing | current-user tasks; saved Pending packages for configured Sales Head; Gate 1 pending packages for CEO | Atomic save immediately populates Sales Head approvals; enforce tenant/assignment |
| Intake/detail/review load | detail(id,mode) | OpportunityWorkspace | Missing | saved form + authorized modules; REVIEW snapshot | Scope/redaction/actions, stable IDs, immutable package lookup |
| Client suggestions | clients | ClientDirectoryPage | Missing | page of clients/contact summaries | Directory owner/schema/tenant search |
| Add/Edit Client drawer | saveClient | SaveOpportunityClient | Missing | persisted client ID/revision/contacts/actions | Explicit directory permissions, contact ownership, revision/idempotency |
| Response owner/reviewer selectors | eligibleUsers | EligibleOpportunityUsers | Missing | active eligible response users with stable IDs and roles | Real eligibility, multiple-role support, cursor search; Opportunity owner uses its directory and approvers are configured automatically server-side |
| Save / Save & Continue | save | SaveOpportunityWorkflow | Missing | same/new record in SALES_REVIEW displayed Pending; configured Sales Head responsibility; current package/revision | One atomic form save and configured Sales Head/CEO routing; owner Pending edits refresh package/revision; no prerequisite validated questions/answers or manual submission |
| Source document upload | upload | UploadOpportunitySource | Missing | real stored document ID/name | Document service, safe transport/size limit, content validation/storage |
| Extraction/retry | extract | StartOpportunityExtraction | Missing | processing job or validated error | Real parser, source refs, async job lifecycle |
| Processing/results | extractionStatus | OpportunityExtractionStatus | Missing | processing/success/failure plus extracted questions | Job polling and ownership; no sample questions |
| Add/edit/remove questions, generic selections/instructions | save(form.rfp) | SaveOpportunityWorkflow | Missing | stable prepared-item IDs/keys | Atomic reconcile; only affected approvals invalidated |
| Assignment | assign | AssignOpportunityResponse | Missing | updated response owner/reviewer/due/revisions | Independent active eligibility, version conflicts |
| Draft/submission | answer | SaveOpportunityAnswer | Missing | saved/Submitted current response revision | Owner/stage checks and versioned answer storage |
| Review/changes/resubmission | reviewAnswer / answer | ReviewOpportunityAnswer / SaveOpportunityAnswer | Missing | Approved/Changes requested with reason/version | Independent reviewer, exact submitted revision, affected-only invalidation |
| Estimation tab/Overview | saveEstimation / detail | SaveOpportunityEstimation / OpportunityWorkspace | Missing | saved decimal matrix/total/revision | Redaction, fixed-point calculation, preparation action |
| Scope tab/Overview | saveScope / detail | SaveOpportunityScope / OpportunityWorkspace | Missing | saved scope summary, alignment items and risks (with severity), plus revision | Revisioned scope/alignment/risk module and summary projection |
| Sales Head approve/reject from Overview | decide | DecideOpportunityPackage | Missing | GATE1_PENDING with configured CEO responsibility, or SALES_REJECTED; retained history | Assigned Sales Head + permission + current package CAS/idempotency; approval and CEO routing atomic; rejection reason; no response-readiness gate |
| CEO Go/No-Go | decide | DecideOpportunityPackage | Missing | GATE1_GO or GATE1_NO_GO with history | Assigned CEO + Sales approval + package CAS/idempotency; No-Go reason |
| Progress/history/recommendation | detail / mutation output | OpportunityWorkspace | Missing | actor/time/history/current responsibility/recommendation | Backend audit identity, saved package decisions, no invented events |

Legacy opportunityList and proposalSectionsList are incomplete id-only [] stubs;
they are excluded from live calls. rfpQuestionsList supplies prepared question
templates; rateMasters remains an unconnected rate catalog. Neither is
extraction/answer data or a live response/estimation record. Proposed exact
shapes/nullability/errors and
per-operation scope/version rules are in graphql-contract.md and the validated SDL.
