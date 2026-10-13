# Reference field mapping

The current fields below are implemented in intake/drawers, saved Overview, modules or
response/decision UI. The existing opportunity schema has no field beyond id
and is not in the live gateway. All opportunity/client/workflow mappings are
**proposed**, except the master/user identities explicitly named below.
See `contracts/opportunity-workflow.proposed.graphql` for exact input/output
shapes and `frontend/packages/@xts/api-contracts/src/opportunity.ts` for UI types.

API paths use the same property names as domain paths. `form.rfp.source` is a
server document object; save sends `form.rfp.sourceDocumentId`, omitting the
server-owned extraction state. Neither opportunity saving nor response saving
updates a shared client implicitly. Address is stored as supplied display/postal
text, and structured country/state/city/street are independent supplied fields;
no automatic copying and no invented Address line 2.
Save itself atomically creates/updates Pending (`SALES_REVIEW`) and assigns the
configured Sales Head; Sales approval automatically routes to the configured CEO.
These approvers are server-managed rather than form inputs. Owner edits while
Pending refresh the saved package/revision. Source validation, answers and response
review do not gate the Sales Head/CEO approval sequence.

The simplified form removes Relationship, Street address, Version, Vendor demonstration,
Portal URL, Submission timezone, Issue date, Proposal due date, Additional deadline/label
and the Context drawer. Existing values remain in the wire contract for compatibility;
frontend saves do not require those hidden fields. The owner dropdown has no extra search box.
Additional contacts use the same five required fields as the primary contact. The proposed
backend input/output for additional contacts now includes title, phone and decisionRole;
this is a backend handoff requirement only, with no backend implementation changed.

| Group | UI label | Domain ? API path | Validation | Storage owner |
|---|---|---|---|---|
| Opportunity | Opportunity name/title | form.title | Required for Pending; trim, bounded text | Opportunity service |
| Opportunity | Estimated value | form.estimatedValue | Required; non-negative Decimal string, 2 decimals | Opportunity service |
| Opportunity | Currency | form.currencyId | Required active currencies.currencyId FK; summary returns currencyCode | Opportunity service |
| Opportunity | Service line | form.serviceLine | Required dropdown: Digital engineering / Consulting from the HTML reference; retains existing saved values; no implemented service-line master | Opportunity service |
| Opportunity | Lead source | form.leadSource | Optional controlled descriptive text | Opportunity service |
| Opportunity | Opportunity owner | form.ownerId | Required stable user ID from active userList; rolesList supplies display only; inactive current owner preserved for display, real assignment validated on save | Opportunity service; existing user/admin directory reads |
| Opportunity | Priority | form.priority | LOW/MEDIUM/HIGH | Opportunity service |
| Opportunity | Description | form.description | Optional bounded text | Opportunity service |
| Opportunity | Linked client | form.clientId | Required stable client ID; never implicit client upsert | Opportunity service |
| Client | Organization/account name | client.name | Required for client save | Client directory service (proposed; no existing owner/API) |
| Client | Account type | client.accountTypeId | Active accountTypes.accountTypeId FK | Client directory service (proposed; no existing owner/API) |
| Client | Sector/industry | client.industryId | Active industries.industryId FK | Client directory service (proposed; no existing owner/API) |
| Client | Website | client.website | Optional HTTP(S) URL | Client directory service (proposed; no existing owner/API) |
| Client | Address | client.address | Optional display/postal address; independent stored text | Client directory service (proposed; no existing owner/API) |
| Client | Country | client.country | Required for client save | Client directory service (proposed; no existing owner/API) |
| Client | State/province | client.stateProvince | Required for client save | Client directory service (proposed; no existing owner/API) |
| Client | City | client.city | Required for client save | Client directory service (proposed; no existing owner/API) |
| Primary contact | Full name | client.primaryContact.name | Required | Client/contact directory service (proposed) |
| Primary contact | Title/role | client.primaryContact.title | Required | Client/contact directory service (proposed) |
| Primary contact | Email | client.primaryContact.email | Required email | Client/contact directory service (proposed) |
| Primary contact | Phone | client.primaryContact.phone | Required phone text, retains +/country code | Client/contact directory service (proposed) |
| Primary contact | Role in decision | client.primaryContact.decisionRole | Required descriptive value | Client/contact directory service (proposed) |
| Additional contacts | Full name | client.additionalContacts[].name | Required when an extra contact exists; add/remove retains optional stable id | Client/contact directory service (proposed) |
| Additional contacts | Email | client.additionalContacts[].email | Required valid email when an extra contact exists | Client/contact directory service (proposed) |
| Additional contacts | Title/role | client.additionalContacts[].title | Required when an extra contact exists | Client/contact directory service (proposed) |
| Additional contacts | Phone | client.additionalContacts[].phone | Required phone text, retains +/country code | Client/contact directory service (proposed) |
| Additional contacts | Role in decision | client.additionalContacts[].decisionRole | Required; same choices as primary contact | Client/contact directory service (proposed) |
| Solicitation | Solicitation/reference number | form.solicitation.reference | Required non-whitespace text before save | Opportunity/RFP intake service |
| Solicitation | Issuing agency/department | form.solicitation.issuingAgency | Required non-whitespace text before save | Opportunity/RFP intake service |
| Solicitation | Procurement contact | form.solicitation.procurementContact | Optional text, separate from linked primary contact | Opportunity/RFP intake service |
| Solicitation | Submission method | form.solicitation.submissionMethod | Required PORTAL/EMAIL/PHYSICAL; current default PORTAL | Opportunity/RFP intake service |
| Solicitation | Submission email | form.solicitation.submissionEmail | Optional; valid email when supplied | Opportunity/RFP intake service |
| Solicitation | Delivery address/instructions | form.solicitation.deliveryInstructions | Optional intake text | Opportunity/RFP intake service |
| Solicitation | Contract term | form.solicitation.contractTerm | Optional text | Opportunity/RFP intake service |
| Solicitation | Incumbent vendor | form.solicitation.incumbentVendor | Optional text | Opportunity/RFP intake service |
| Solicitation | Pre-bid meeting | form.solicitation.preBidMeeting | UNCONFIRMED/YES/NO | Opportunity/RFP intake service |
| Important dates | Questions due | form.dates.questionsDue | Optional date | Opportunity/RFP intake service |
| Important dates | Submission deadline | form.dates.submissionDeadline | Required calendar-valid YYYY-MM-DD date before save | Opportunity/RFP intake service |
| RFP selector | RFP type | form.rfp.type | QUESTIONNAIRE/GENERIC/null; optional for Pending/approval; switching confirms affected-item deletion | Opportunity/RFP intake service |
| Generic RFP | Source document/brief | form.rfp.sourceDocumentId (wire); source.id (UI) | Uploaded document ID; filename alone cannot count as uploaded | Opportunity/RFP/document service |
| Generic RFP | Submission format | form.rfp.submissionFormat | TECHNICAL_COST/COMBINED | Opportunity/RFP/document service |
| Generic RFP | Output file format | form.rfp.outputFormat | PDF/DOCX/PPTX | Opportunity/RFP/document service |
| Generic RFP | Page limit/volume rules | form.rfp.pageRules | Text; supports separate volume limits | Opportunity/RFP/document service |
| Generic RFP | Evaluation basis | form.rfp.evaluation | Optional bounded text | Opportunity/RFP/document service |
| Generic RFP | Proposal section selection | form.rfp.sections[].key | 12 supported catalog keys in one flat checkbox panel; backend validates supported catalog | Opportunity/RFP/document service |
| Generic RFP | Section instructions | form.rfp.sections[].instructions | Text persisted per stable section key | Opportunity/RFP/document service |
| Both RFP formats | Source document | form.rfp.sourceDocumentId (wire); source.id (UI) | Uploaded stable document ID; 25 MB maximum in UI | Opportunity/RFP/extraction service |
| Both RFP formats | Extraction status | form.rfp.extraction.id/state/error | Server-owned PROCESSING/SUCCEEDED/FAILED; not accepted as save input | Opportunity/RFP/extraction service |
| Both RFP formats | Prepared question text | form.rfp.questions[].text | Manual questions for both formats; preparation is independent of Sales approval; edit resets legacy validation metadata | Opportunity/RFP/extraction service |
| Both RFP formats | Question Master identity | form.rfp.questions[].masterQuestionId | Optional numeric active rfpQuestionsList identity; unique draft question ID per import; duplicate master imports suppressed | Existing admin Question Master read; Opportunity/RFP save proposed |
| Both RFP formats | Source reference | form.rfp.questions[].sourceReference | Retained internal provenance on existing questions; source-reference input removed | Opportunity/RFP/extraction service |
| Both RFP formats | Source validation | form.rfp.questions[].validated | Legacy metadata retained without a checkbox; not a frontend readiness, answer-submission or package-approval prerequisite | Opportunity/RFP/extraction service |
| Both RFP formats | Question identity/add/remove | form.rfp.questions[].id | Server stable ID or draft- UUID reconciled transactionally by save; removing invalidates only affected response/approval | Opportunity/RFP/extraction service |
| Responses | Owner | responses[].owner.id | Active eligible user; stable ID | Opportunity workflow service |
| Responses | Independent reviewer | responses[].reviewer.id | Active eligible user, different from owner | Opportunity workflow service |
| Responses | Due date | responses[].dueDate | Valid ISO date required when assigning response work, independent of package approval | Opportunity workflow service |
| Responses | Answer draft | responses[].answer | Owner-only; must be nonempty for submission | Opportunity workflow service |
| Responses | Answer state | responses[].state | Backend enum; lifecycle described in graphql-contract.md | Opportunity workflow service |
| Responses | Answer revision | responses[].revision/submittedRevision/approvedRevision | Backend-owned version; review checks exact submitted version | Opportunity workflow service |
| Responses | Review reason | responses[].reviewComment | Reason required for changes, backend-owned after decision | Opportunity workflow service |
| Estimation | Matrix work item/role | estimation.rows[].workItem | Nonempty per row | Opportunity workflow service |
| Estimation | Hours per person | estimation.rows[].hours | Non-negative decimal string, up to 4 decimals | Opportunity workflow service |
| Estimation | People | estimation.rows[].people | Positive safe integer | Opportunity workflow service |
| Estimation | Hourly rate | estimation.rows[].hourlyRate | Non-negative decimal string, up to 4 decimals | Opportunity workflow service |
| Estimation | Row amount | estimation.computed in UI and backend | Round exact row product to 2 decimals; backend independently calculates | Opportunity workflow service |
| Estimation | Total | estimation.total | Sum rounded row amounts; authoritative backend total | Opportunity workflow service |
| Estimation | Assumptions | estimation.assumptions | Bounded text | Opportunity workflow service |
| Estimation | Revision | estimation.revision | Backend-owned optimistic lock | Opportunity workflow service |
| Scope | Objective | scope.objective | Bounded text; saved revision shown on Overview | Opportunity workflow service |
| Scope | Deliverables | scope.deliverables | Bounded text; saved revision shown on Overview | Opportunity workflow service |
| Scope | Inclusions | scope.inclusions | Bounded text; saved revision shown on Overview | Opportunity workflow service |
| Scope | Exclusions | scope.exclusions | Bounded text; saved revision shown on Overview | Opportunity workflow service |
| Scope | Dependencies/assumptions | scope.dependencies | Bounded text; saved revision shown on Overview | Opportunity workflow service |
| Scope | Acceptance criteria | scope.acceptance | Bounded text; saved revision shown on Overview | Opportunity workflow service |
| Approval & progress | Sales reviewer | Server assignment; responsible.id while SALES_REVIEW | Configured active eligible user resolved automatically in atomic save; no frontend selector/input | Opportunity workflow service |
| Approval & progress | Gate 1 approver | Server assignment; responsible.id while GATE1_PENDING | Configured active eligible CEO assigned automatically by Sales approval; no implicit Admin approval | Opportunity workflow service |
| Approval & progress | Reviewed package | packageRevision | Immutable server snapshot revision; decision must match | Opportunity workflow service |
| Approval & progress | Decision reason | reason | Required for SALES_REJECT/GATE1_NO_GO | Opportunity workflow service |
| Approval & progress | Reviewed confirmation | confirmed | Required true for decisions | Opportunity workflow service |
| Approval & progress | Status/progress | state | Server transition only; form saves never accept state | Opportunity workflow service |
| Approval & progress | Actor/time/history | activity[].actor/at | Derived from authenticated backend identity and clock | Opportunity workflow service |

## Full proposal catalog

Overview: Understanding of requirements; Experience & references; Executive
summary; Company credentials.
Technical: Project plan & timeline; Team & key personnel; Scope & deliverables;
Technical approach & solution; Security & compliance.
Commercial: Assumptions & dependencies; Pricing & commercials; Support & service
levels. Instructions are stored on each selected section, not category tabs.

## Date and decimal policy

ISO date-only values remain strings through input, adapters and GraphQL. Proposed
wire strings allow an empty Pending field; nonempty values must be valid calendar
dates. Backend persistence uses DATE or equivalent date-only types, never midnight
UTC instants. Submission timezone is a separate IANA value. No submission-time-of-
day field exists in the reference; it must not be fabricated.
Money/rates/hours are decimal strings. Matrix calculations use BigInt fixed-point,
round each row to 2 decimals then sum. Do not add different currencies or use a
JavaScript float as authoritative accounting persistence. backend pricing should
confirm currency-specific minor-unit rules before extending beyond this 2-decimal
contract. Calendar chronology/maxlength/duplicate-contact policies remain backend
validation requirements, rather than being silently guessed from the prototype.

## Current RFP preparation controls

Both Questionnaire and Generic RFP show an enabled local file picker for editable
opportunities. Only Questionnaire shows `Extract questions`; Generic has no extraction
action or extraction messaging. Clicking the Questionnaire button displays
`AI question extraction is currently under development.` It does not upload, save,
start a job, poll, or create questions. Selected files remain only in component memory;
no filename is presented as a persisted document. The existing GraphQL document
adapter is retained for later backend/AI integration.

Both formats expose `+ Add question` and question text/removal. The Question Master
button, source-reference input, validation checkbox and validation-status badge are
removed from this form. Existing master IDs/provenance/validation data remain in the
contract for compatibility. Generic questions are saved alongside proposal sections
and both produce response items in the frontend local workflow.
