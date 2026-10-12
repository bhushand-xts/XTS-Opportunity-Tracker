# Opportunity form master-data availability

Checked 2026-10-12 against repository sources, the configured local GraphQL gateway
at localhost:4000/graphql, and read-only metadata in the database used by the admin
service. The initial availability audit changed no application, database records
or permissions. The subsequent frontend integration connects question templates
and the user-authorized Opportunity owner directory. Counts are a snapshot of
that local environment; another environment may differ. No personal identities
are included in this report.

## Direct intake and client-drawer mappings

| Form field | Physical table | Existing GraphQL read | Active records verified | Current frontend status |
|---|---|---|---|---|
| Currency | mst_currency | currencies | 21 | Already connected to form.currencyId, active records only |
| Account type | mst_account_type | accountTypes | 1 | Already connected to client drawer accountTypeId |
| Sector / industry | mst_industry | industries | 1 | Already connected to client drawer industryId |
| Opportunity owner | mst_user, with mst_roles for role descriptions | userList, rolesList | 16 active users; 9 active roles | Connected to active user directory with role display and stable ownerId; preserves an inactive current owner for display. Directory data is not approval/reviewer eligibility |
| Predefined RFP questions | mst_rfp_questions | rfpQuestionsList | 5 | Connected through Questionnaire's Add from Question Master; active templates only, independent editable copies with masterQuestionId. Templates are not extracted results or saved responses |
| Generic proposal sections | mst_proposal_section | proposalSectionsList | 0 physical rows | Not ready: schema exposes only id and repository returns a hardcoded empty array; current form retains the 12 reference section definitions |
| Client organization and linked details | mst_client | None exposed | 9 | Physical directory exists, but client search/create/update adapter is explicitly unavailable until an account/client API is implemented |
| Primary / additional contacts | tbl_client_contact_person | None exposed | Table and column metadata verified; contact data not fetched | Physical table exists, but contact API and ownership contract are missing |

The existing lookup query is
`frontend/packages/@xts/mfe-opportunity/src/services/opportunity.queries.ts`.
`productionOpportunityService.lookups()` in `services/OpportunityService.ts` reads
currencies, accountTypes and industries through the shared Apollo client and
filters `isActive`. The API contracts serialize those existing integer master IDs
as strings in the UI; labels are display values, not replacement foreign keys.
`OpportunityOwnerSelect` reads the directory through `useOwnerDirectory` and
`GetOpportunityOwnerDirectory`; `RfpQuestionTemplatePicker` reads templates through
`useRfpQuestionTemplates`. Both use the shared Apollo provider and existing reads.
Question imports retain numeric `masterQuestionId`, create a unique draft question
ID, set `sourceReference` to `Question Master #id` and start with `validated: false`.
Importing the same master twice is suppressed. Editing an imported question does
not modify the shared master. Real opportunity saving remains unavailable.

## Masters for subsequent preparation/workflow screens

| UI area | Table | GraphQL read | Active / total verified | Integration consideration |
|---|---|---|---|---|
| Stage / gate tracking | mst_stage | stagesList | 10 / 10 | Use admin's implemented stagesList; the opportunity service's singular stageList is a stub. Stage IDs need explicit domain/state mapping, not a freely editable save-stage dropdown |
| Stage-dependent sub-status | mst_sub_stage | subStagesList | 18 / 18 | Filter by selected stageId and active state; transitions still require workflow authorization |
| Estimation grouping | mst_estimation_phases | estimationPhasesList | 7 / 8 | Add a phaseId reference to the current estimation row contract before connection |
| Estimation role / rate defaults | mst_rate | rateMasters | 4 / 4 | Current records are Monthly rates; do not put defaultRate directly into the hourlyRate field. Preserve currencyId and define working-hours/conversion policy first |
| Rejection / hold / No-Go reason options | tbl_reason_codes | reasonCodesList | 1 / 1 | Can supplement required free-text explanations; current decision input has no reasonCodeId |

These read APIs returned successful responses in the live gateway. They are not
currently wired into the Opportunity modules. Existing API types and admin query
files can be reused; add the stable references to Opportunity contracts deliberately.
No master read establishes that the separate opportunity save/workflow API works.

## Fields without a discovered master table/API

Service line, Lead source/source type, Opportunity type/RFP type, Priority,
Relationship, Role in decision, Submission method, Vendor demo confirmation,
Pre-bid meeting choice, Proposal submission format, Output format, Country,
State/province, City, and Submission timezone do not have a corresponding master
lookup in the checked database/gateway. The present form uses free text or controlled
UI choices. Source columns `opportunity_type_id` and `source_type_id` exist, but the
repository's status constants explicitly contain empty mappings; an integer column
does not establish a usable lookup master.

## Client and storage gaps to resolve before connection

- mst_client has `account_type` and `sector` text columns, whereas the UI proposes
  accountTypeId/industryId references. The backend must define ID resolution or
  migrate storage; silently writing numeric IDs into descriptive text is incorrect.
- The checked mst_client table has no separate `relationship` or `address` column.
  It has country/state/city/street_address. Preserve the reference's Address field
  with an explicit schema/API mapping rather than copying it into street_address.
- tbl_client_contact_person stores `role_in_decision` as integer; the UI currently
  has descriptive values, and there is no verified numeric lookup mapping.
- Existing contacts have client_contact_id/client_id/contact_sequence. Preserve
  these stable IDs and ownership when implementing primary/additional contact APIs.
- Users have one role in the current store. The active owner directory is connected
  at the user's request; backend saving must validate owner assignment and tenant
  scope. Reviewer/approver eligibility and independent review still require the
  missing backend eligibility API; role labels do not grant authorization.

## Source/schema drift

The live database contains mst_currency and newer mst_rate columns (`role_code`,
`rate_type`, `currency_id`, `default_rate`, `location`), matching current repositories.
`backend/database/services/admin/schema.sql` omits currency DDL and contains an older
rate definition (`locaton`, `monthly_rate`, `currency_code`). The account schema
file is a placeholder even though the live shared database has client/contact
tables. Availability above therefore uses live metadata/API evidence alongside
source inspection, not DDL assumptions alone.

## Practical connection order

The three existing master fields, active RFP question templates and active
Opportunity owner directory are connected. Implement account/client and
reviewer/approver eligibility APIs next. Connect stage/sub-stage, phases/rates and
reason codes in their respective workflow modules, with the contract and rate-unit
considerations above. Proposal Sections requires real repository/schema
implementation and populated master data first.
