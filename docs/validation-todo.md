# Validation to-do after removing Save & Continue

Updated: 13 October 2026.

The opportunity form now has Save Opportunity and Cancel only. Save retains its persistence, Pending/Sales Head behavior, and protection for unsaved answers. RFP type selection is now required on Save; document and response preparation remain optional.

## Required validation work

- [x] Reject Questions Due later than Submission Deadline, with an immediate inline error below Questions Due when either date changes. An empty Questions Due remains optional and equal dates are permitted.
- [ ] Require Source and show its error below the field. Use Public Procurement Portal, Referral, Inbound Enquiry, Existing Client, Partner, Outbound, and Other.
- [x] Require Estimated Value to be strictly greater than zero; preserve the existing numeric and decimal checks.
- [x] Explicitly validate Priority as High, Medium, or Low, retaining the current Medium default.
- [ ] Restrict the Owner dropdown to eligible active Sales/BD users and enforce eligibility when saving.
- [x] Validate the selected existing client's required account data and Primary Contact before saving an opportunity, not just its client ID. Refresh the selected record before persistence and validate additional contacts too.
- [x] Validate phone format for primary and additional contacts: 7–15 digits, optional leading +, spaces, hyphens, dots, and balanced parentheses. This checks formatting, not country-specific validity or ownership; extensions are not accepted.
- [x] Add immediate inline errors to the Add Client form and all primary/additional contact fields. Preserve the existing required-field and email checks. Selected-client errors also appear against the corresponding account/contact values.
- [x] Validate submitted dropdown values against permitted active master records or configured options. Fresh currency/account/industry and active eligible-owner checks run before opportunity persistence; fixed dropdowns use shared options. An unchanged saved legacy Service Line/Lead source is retained to preserve existing records.
- [x] Block duplicate titles after ignoring case, surrounding whitespace, and repeated internal whitespace. The UI scans every accessible Pipeline page, excludes the record being edited, and rechecks before saving. Local persistence checks every stored record before mutation.
- [ ] Implement production backend opportunity/client save validation and integrity checks. Frontend checks and development browser-storage checks do not provide server enforcement.

## Decisions needed for the revised Save-only flow

- [ ] Implement a database/server uniqueness constraint for normalized titles before production rollout. Client-side Pipeline checks cannot see inaccessible records or prevent simultaneous saves by different users; local-mode enforcement is not a production constraint.

- [x] Require either Questionnaire or Generic RFP on Save Opportunity, as requested for the revised flow.
- [x] Show the missing-selection error below the existing cards and clear it when a type is selected; retain single selection and optional response preparation.
- [ ] Confirm whether solicitation/reference number, issuing agency, submission method, and submission deadline should remain mandatory on initial Save. They currently are, although the supplied initial-creation document does not list them as mandatory.
- [ ] Confirm which hardcoded lists require configurable masters: Service Line, Source, Priority, and Role in Decision. Clarify whether Relationship should be exposed in Add Client and whether it is mandatory.

## Related requirements outside field validation

- [ ] Move Client Selection above Opportunity details if the original placement requirement still applies.
- [ ] Connect the client picker to active Client Master records and exclude inactive records in the server directory query.
- [ ] Confirm whether additional stakeholders should belong to the opportunity or the shared client record; they currently belong to the client.

## Removed from the to-do scope

- Continue to RFP Intake / Save & Continue action.
- Mandatory checks specifically tied to that removed continuation action.
- Automatic RFP-type-specific navigation immediately after saving, unless separately requested for the new flow.

Already covered in the frontend: required client selection/title/value/currency/service line/owner, all 16 requested service-line options, required client/contact fields during client saving, email format, single RFP selection, Cancel confirmation, ID reuse, and inline errors for currently validated opportunity fields.

The earlier `validation-coverage-report.md` records the review against the original document and its former Save & Continue flow; this file describes the remaining work under the revised flow.
