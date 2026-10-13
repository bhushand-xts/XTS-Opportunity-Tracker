# Opportunity creation validation coverage

Reviewed: 13 October 2026.

Historical baseline: this report describes the original review before the Save & Continue removal and subsequent validation work. See [validation-todo.md](validation-todo.md) for the current implementation status and production limitations.

Overall result: **No — the supplied requirements are not fully covered.**

This is a source-code review of the supplied “Client Selection…” document against the current repository, including the recent inline validation change. It does not certify a deployed environment. “Yes” below means the stated frontend behavior is implemented; production backend enforcement is assessed separately.

## Mandatory fields and format checks

| Requirement | Covered? | Current behavior / gap |
| --- | --- | --- |
| Client selection is mandatory | Yes, frontend | Save and Save & Continue reject an empty client ID. Search and selection link the selected ID to the opportunity. |
| Client dropdown contains only active Client Master records | No / unverified | The picker delegates to the directory service. The local directory uses browser-stored clients without an active-record filter; no production directory resolver was found in this repository. |
| Opportunity Title is mandatory | Yes, frontend | Blank and whitespace-only titles are rejected. |
| Opportunity Title is unique where applicable | No | No duplicate-title check or unique title constraint was found. The applicable uniqueness scope is also unspecified in the document. |
| Estimated Value is mandatory and numeric | Yes, frontend | Requires a non-negative decimal with at most two decimal places. |
| Estimated Value must be positive | No | `0` and `0.00` pass; the required strictly positive rule is not implemented. |
| Currency is mandatory and comes from Currency Master | Yes, frontend dropdown; partial enforcement | The dropdown loads active configured currencies and requires selection. The frontend save validator checks presence, rather than membership. The local service additionally checks membership; production enforcement is not implemented here. |
| Service Line is mandatory and includes all 16 specified options | Yes, frontend | All requested options are present. Existing Digital engineering and Consulting options remain. The validator checks non-empty text, rather than permitted-option membership. |
| Source is mandatory | No | Lead source has neither a mandatory-field rule nor inline validation. It can remain empty. |
| Source has the specified seven options | No | Current options are Inbound, Referral, Outbound, Tender portal, Partner, RFP / Tender, and Direct enquiry. Public Procurement Portal, Inbound Enquiry, Existing Client, and Other are not present with the specified labels. |
| Owner is mandatory | Yes, frontend | An empty owner ID blocks saving. The owner control displays an inline error. |
| Owner lists only eligible active Sales/BD users | Partial | Active users are selectable, but the dropdown does not restrict by Sales/BD role or opportunity eligibility. An existing inactive assignment can appear disabled. The local save service checks active status and view/edit permission, not Sales/BD role. |
| Priority is mandatory and limited to High, Medium, Low | Partial | Those choices are present and Medium is the default. There is no explicit required-value or allowed-value save validation. |
| Primary Contact Full Name, Title/Role, Email, Phone, Role in Decision are mandatory | Partial | All five are checked when saving a client. Opportunity saving only checks client ID; it does not revalidate the selected existing client's primary contact. |
| Every added secondary contact has all five required fields | Yes, Add Client frontend | Client saving rejects incomplete additional contacts. This check is not rerun as part of opportunity saving. |
| Email format validation | Yes, Add Client frontend | The client save handler validates primary and additional contact emails using an email regex. |
| Phone format validation | No | Only non-empty text is checked. `type="tel"` does not itself enforce a phone format. |
| RFP Type is mandatory before continuing to intake | No | The draft starts with no RFP type. Save & Continue uses the same validator as Save, which does not require RFP type. The UI explicitly describes RFP preparation as optional. A separate readiness helper requires a type, but Save & Continue does not call it. |
| Errors appear against each relevant field | Partial | Opportunity title, value, currency, service line, owner, client selection, procurement fields, and dates have inline messages. Add Client / contact errors remain combined notices. Source, priority, and RFP type lack corresponding mandatory inline validation. |

## Related workflow and business rules

| Requirement | Covered? | Current behavior / gap |
| --- | --- | --- |
| Client selection appears at the top | No | Opportunity details appear before Client & primary contact. |
| Search and select an existing client and use its account information | Yes, UI; production integration incomplete | The picker shows client names, selects the record, and displays its stored account/contact details. |
| Add a new client through an Add Client form | Yes, UI/local mode; production integration incomplete | The drawer provides creation and linking, subject to permissions. Production client persistence is not implemented in this repository. |
| Add/remove multiple secondary contacts; distinguish primary contact | Yes, UI | Separate Primary contact and Additional contacts sections support adding and removing contacts. Contacts are stored on the shared client record, rather than as independent opportunity stakeholders. |
| Only one RFP type can be selected | Yes, UI | A single `rfp.type` value controls the two selectable cards. Choosing another replaces the selected type. |
| Validate Opportunity, Client/Account, and Primary Contact before proceeding | No, incomplete | Save validation checks opportunity fields and client ID. It does not revalidate the selected client's required account/contact data, source, priority, or RFP type. |
| Continue to RFP Intake saves and routes according to the selected RFP type | Partial | The current action is Save & Continue. It saves and opens the same opportunity edit workspace; that workspace conditionally renders the selected RFP content. There is no separate required-type intake gate or type-specific navigation route. |
| Selected RFP type remains associated with the saved opportunity | Yes, UI/local service | The saved form includes `rfp.type`; production persistence is not implemented here. |
| Retain Opportunity ID in subsequent stages | Yes, UI/local service | The persisted ID is reused for subsequent saves. Existing regression tests cover this behavior. |
| Cancel returns to Pipeline and confirms discarding unsaved changes | Yes, UI | Cancel calls the unsaved-change confirmation before navigating to `/opportunity`. |
| Populate configured master data where applicable | Partial | Currency, Account Type, and Sector/Industry use active master lookups; Owner uses the user directory. Service Line, Source, Priority, and Role in Decision are hardcoded. Relationship exists in the client model but is not exposed in the current Add Client form. Which of these require separate configurable masters needs specification. |

## Backend enforcement limitation

The app's production path uses `createWorkflowService`, which calls proposed workflow GraphQL operations. Implementations of the corresponding opportunity save and client directory/save operations were not found in the backend source. The opportunity backend validator contains no active checks, its service exposes only a list operation, and its repository returns an empty list.

Development local-workflow mode uses browser storage and has additional client/currency/owner checks. Those checks are not production server enforcement. Frontend “Yes” entries therefore must not be treated as full production coverage.

## Additional current mandatory checks

The current save validator also requires solicitation/reference number, issuing agency/department, submission method, and submission deadline, and validates questions-due/deadline dates. These checks are implemented but are not listed as mandatory in the supplied initial-creation requirements. They currently gate both Save and Save & Continue.

## Code evidence

- `frontend/packages/@xts/mfe-opportunity/src/lib/workflow.ts`: mandatory opportunity rules and separate readiness rules.
- `frontend/packages/@xts/mfe-opportunity/src/components/OpportunityFormPage.tsx`: options, field order, save guards, inline-validation scope, continuation and cancel behavior.
- `frontend/packages/@xts/mfe-opportunity/src/components/ClientPicker.tsx`: client/contact fields, format checks, client search and combined client-validation notices.
- `frontend/packages/@xts/mfe-opportunity/src/components/OpportunityOwnerSelect.tsx`: active-user filtering and existing assignments.
- `frontend/packages/@xts/mfe-opportunity/src/components/RfpPreparation.tsx`: single RFP selection and conditional workspace content.
- `frontend/packages/@xts/mfe-opportunity/src/services/proposed/createWorkflowService.ts`: active master lookups and proposed production operations.
- `frontend/packages/@xts/mfe-opportunity/src/App.tsx`: production adapter and explicit development local-workflow mode.
- `frontend/packages/@xts/mfe-opportunity/src/testing/fixtures.ts`: local persistence and supplementary validation.
- `backend/services/opportunity/src/validators/opportunity.validator.ts`: inactive backend validation placeholder.
- `backend/services/opportunity/src/services/opportunity.service.ts` and `repositories/opportunity.repository.ts`: backend service/repository placeholders.
- `backend/database/services/opportunity/schema.sql`: no opportunity-title uniqueness constraint.

No application code was changed as part of this review.
