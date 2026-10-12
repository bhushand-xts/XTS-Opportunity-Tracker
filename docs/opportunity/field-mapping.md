# Reference field mapping

Every field below is implemented in intake/drawers, saved Overview, modules or
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

| Group | UI label | Domain ? API path | Validation | Storage owner |
|---|---|---|---|---|
| Opportunity | Opportunity name/title | form.title | Required for Pending; trim, bounded text | Opportunity service |
| Opportunity | Estimated value | form.estimatedValue | Required; non-negative Decimal string, 2 decimals | Opportunity service |
| Opportunity | Currency | form.currencyId | Required active currencies.currencyId FK; summary returns currencyCode | Opportunity service |
| Opportunity | Service line | form.serviceLine | Required text; no implemented service-line master | Opportunity service |
| Opportunity | Lead source | form.leadSource | Optional controlled descriptive text | Opportunity service |
| Opportunity | Opportunity owner | form.ownerId | Required stable user ID from active userList; rolesList supplies display only; inactive current owner preserved for display, real assignment validated on save | Opportunity service; existing user/admin directory reads |
| Opportunity | Priority | form.priority | LOW/MEDIUM/HIGH | Opportunity service |
| Opportunity | Description | form.description | Optional bounded text | Opportunity service |
| Opportunity | Linked client | form.clientId | Required stable client ID; never implicit client upsert | Opportunity service |
| Client | Organization/account name | client.name | Required for client save | Client directory service (proposed; no existing owner/API) |
| Client | Relationship | client.relationship | Required for client save | Client directory service (proposed; no existing owner/API) |
| Client | Account type | client.accountTypeId | Active accountTypes.accountTypeId FK | Client directory service (proposed; no existing owner/API) |
| Client | Sector/industry | client.industryId | Active industries.industryId FK | Client directory service (proposed; no existing owner/API) |
| Client | Website | client.website | Optional HTTP(S) URL | Client directory service (proposed; no existing owner/API) |
| Client | Address | client.address | Optional display/postal address; independent stored text | Client directory service (proposed; no existing owner/API) |
| Client | Country | client.country | Required for client save | Client directory service (proposed; no existing owner/API) |
| Client | State/province | client.stateProvince | Required for client save | Client directory service (proposed; no existing owner/API) |
| Client | City | client.city | Required for client save | Client directory service (proposed; no existing owner/API) |
| Client | Street address | client.streetAddress | Optional street/building text; no Address line 2 | Client directory service (proposed; no existing owner/API) |
| Primary contact | Full name | client.primaryContact.name | Required | Client/contact directory service (proposed) |
| Primary contact | Title/role | client.primaryContact.title | Required | Client/contact directory service (proposed) |
| Primary contact | Email | client.primaryContact.email | Required email | Client/contact directory service (proposed) |
| Primary contact | Phone | client.primaryContact.phone | Required phone text, retains +/country code | Client/contact directory service (proposed) |
| Primary contact | Role in decision | client.primaryContact.decisionRole | Required descriptive value | Client/contact directory service (proposed) |
| Additional contacts | Name | client.additionalContacts[].name | Required when an extra contact exists; add/remove retains optional stable id | Client/contact directory service (proposed) |
| Additional contacts | Email | client.additionalContacts[].email | Required valid email when an extra contact exists | Client/contact directory service (proposed) |
| Solicitation | Solicitation/reference number | form.solicitation.reference | Required at Sales submission; optional Pending | Opportunity/RFP intake service |
| Solicitation | Version | form.solicitation.version | Optional reference version text | Opportunity/RFP intake service |
| Solicitation | Issuing agency/department | form.solicitation.issuingAgency | Required at Sales submission | Opportunity/RFP intake service |
| Solicitation | Procurement contact | form.solicitation.procurementContact | Optional text, separate from linked primary contact | Opportunity/RFP intake service |
| Solicitation | Submission method | form.solicitation.submissionMethod | PORTAL/EMAIL/PHYSICAL | Opportunity/RFP intake service |
| Solicitation | Vendor demonstration required | form.solicitation.vendorDemo | UNCONFIRMED/YES/NO | Opportunity/RFP intake service |
| Solicitation | Portal URL | form.solicitation.portalUrl | Required HTTP(S) at submission if PORTAL | Opportunity/RFP intake service |
| Solicitation | Submission email | form.solicitation.submissionEmail | Required valid email at submission if EMAIL | Opportunity/RFP intake service |
| Solicitation | Delivery address/instructions | form.solicitation.deliveryInstructions | Required text at submission if PHYSICAL | Opportunity/RFP intake service |
| Solicitation | Contract term | form.solicitation.contractTerm | Optional text | Opportunity/RFP intake service |
| Solicitation | Incumbent vendor | form.solicitation.incumbentVendor | Optional text | Opportunity/RFP intake service |
| Solicitation | Pre-bid meeting | form.solicitation.preBidMeeting | UNCONFIRMED/YES/NO | Opportunity/RFP intake service |
| Solicitation | Submission timezone | form.solicitation.submissionTimezone | Valid IANA timezone; default Asia/Kolkata | Opportunity/RFP intake service |
| Important dates | Issue date | form.dates.issueDate | Optional ISO YYYY-MM-DD calendar date | Opportunity/RFP intake service |
| Important dates | Questions due | form.dates.questionsDue | Optional date | Opportunity/RFP intake service |
| Important dates | Proposal due date | form.dates.proposalDue | Optional date | Opportunity/RFP intake service |
| Important dates | Submission deadline | form.dates.submissionDeadline | Required date at submission; optional Pending | Opportunity/RFP intake service |
| Important dates | Additional deadline | form.dates.additionalDeadline | Optional date | Opportunity/RFP intake service |
| Important dates | Additional deadline label | form.dates.additionalDeadlineLabel | Text; backend requires when additionalDeadline is set at submission | Opportunity/RFP intake service |
| Context drawer | Instructions | form.context.instructions | Optional bounded text; Apply edits draft, Save Opportunity persists | Opportunity/RFP intake service |
| Context drawer | Submission requirements | form.context.submissionRequirements | Optional bounded text; Apply edits draft, Save Opportunity persists | Opportunity/RFP intake service |
| Context drawer | Opportunity overview | form.context.opportunityOverview | Optional bounded text; Apply edits draft, Save Opportunity persists | Opportunity/RFP intake service |
| Context drawer | Scope of work | form.context.scopeOfWork | Optional bounded text; Apply edits draft, Save Opportunity persists | Opportunity/RFP intake service |
| Context drawer | Key technical/functional requirements | form.context.requirements | Optional bounded text; Apply edits draft, Save Opportunity persists | Opportunity/RFP intake service |
| Context drawer | Notes | form.context.notes | Optional bounded text; Apply edits draft, Save Opportunity persists | Opportunity/RFP intake service |
| RFP selector | RFP type | form.rfp.type | QUESTIONNAIRE/GENERIC/null; no type required for Pending, required for submission; switching confirms affected-item deletion | Opportunity/RFP intake service |
| Generic RFP | Source document/brief | form.rfp.sourceDocumentId (wire); source.id (UI) | Uploaded document ID; filename alone cannot count as uploaded | Opportunity/RFP/document service |
| Generic RFP | Submission format | form.rfp.submissionFormat | TECHNICAL_COST/COMBINED | Opportunity/RFP/document service |
| Generic RFP | Output file format | form.rfp.outputFormat | PDF/DOCX/PPTX | Opportunity/RFP/document service |
| Generic RFP | Page limit/volume rules | form.rfp.pageRules | Text; supports separate volume limits | Opportunity/RFP/document service |
| Generic RFP | Evaluation basis | form.rfp.evaluation | Optional bounded text | Opportunity/RFP/document service |
| Generic RFP | Proposal section selection | form.rfp.sections[].key | 12 supported reference catalog keys; backend validates supported catalog | Opportunity/RFP/document service |
| Generic RFP | Section instructions | form.rfp.sections[].instructions | Text persisted per stable section key | Opportunity/RFP/document service |
| Questionnaire | Source document | form.rfp.sourceDocumentId (wire); source.id (UI) | Uploaded stable document ID; 25 MB maximum in UI | Opportunity/RFP/extraction service |
| Questionnaire | Extraction status | form.rfp.extraction.id/state/error | Server-owned PROCESSING/SUCCEEDED/FAILED; not accepted as save input | Opportunity/RFP/extraction service |
| Questionnaire | Prepared question text | form.rfp.questions[].text | Nonempty at submission; manual, extracted or independently editable Question Master copy; edit resets source validation | Opportunity/RFP/extraction service |
| Questionnaire | Question Master identity | form.rfp.questions[].masterQuestionId | Optional numeric active rfpQuestionsList identity; unique draft question ID per import; duplicate master imports suppressed | Existing admin Question Master read; Opportunity/RFP save proposed |
| Questionnaire | Source reference | form.rfp.questions[].sourceReference | Extraction/manual reference or Question Master #id on template import | Opportunity/RFP/extraction service |
| Questionnaire | Source validation | form.rfp.questions[].validated | Required true at submission; Question Master copies start false | Opportunity/RFP/extraction service |
| Questionnaire | Question identity/add/remove | form.rfp.questions[].id | Server stable ID or draft- UUID reconciled transactionally by save; removing invalidates only affected response/approval | Opportunity/RFP/extraction service |
| Responses | Owner | responses[].owner.id | Active eligible user; stable ID | Opportunity workflow service |
| Responses | Independent reviewer | responses[].reviewer.id | Active eligible user, different from owner | Opportunity workflow service |
| Responses | Due date | responses[].dueDate | ISO date required for readiness | Opportunity workflow service |
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
| Approval & progress | Sales reviewer | salesReviewerId | Eligible active stable ID; chosen before submission | Opportunity workflow service |
| Approval & progress | Gate 1 approver | gate1ApproverId | Eligible active stable ID; no Admin implicit approval | Opportunity workflow service |
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
