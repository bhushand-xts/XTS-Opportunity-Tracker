# RFP Intake acceptance coverage

Reviewed: 13 October 2026.

Overall: **Partially implemented. The questionnaire document-upload/extraction workflow is not complete.**

Scope: source-code review of the current app against the supplied acceptance criteria. This is not a deployed-environment certification. No application code was changed for this review.

Status meanings: **Yes** = current behavior implemented; **Partial** = only part of the criterion is implemented; **No** = missing; **Superseded** = conflicts with the approved Save Opportunity / Cancel-only flow.

## 1. Navigation to RFP Intake

| Criterion | Status | Evidence / reason |
| --- | --- | --- |
| Questionnaire selection + Continue to RFP Intake navigates to Upload Document | Superseded / No separate screen | Continue to RFP Intake / Save & Continue was removed at the user's instruction. The current route set contains Pipeline, new/edit opportunity, details, work, approvals, and review; no separate Upload Document route exists. Questionnaire selection reveals document controls within the existing form. |
| Retain opportunity information | Partial | Opportunity and solicitation values remain in the form and are included in the saved form. Local-mode save persists them; edit loads the saved form. Production workflow persistence remains an unfinished backend integration. This does not prove retention across a separate intake route, which does not exist. |
| Associate intake with the corresponding opportunity | Partial | Saved RFP data is nested in the opportunity form and subsequent saves reuse the opportunity ID. However, a newly selected file exists only in component state and is not uploaded or associated with a persisted opportunity/document record. |

The revised acceptance criterion should specify whether saved opportunities are later reopened for RFP preparation. The removed Continue action should not be restored merely to satisfy this older specification.

## 2. Intake progress indicator

| Criterion | Status | Reason |
| --- | --- | --- |
| Details & Type → Upload & Extract → Respond stepper | No | No intake stepper is rendered. |
| Step 1 indicates details captured | No | No completion state is shown for this step. |
| Step 2 active on Upload Document | No | Neither the stepper nor the separate screen exists. |
| Step 3 unlocked after successful extraction and required intake completion | No | Extraction is not connected. Existing response editing is controlled by opportunity modules/permissions, not an extraction-success gate. Manual question preparation is available independently. |

## 3. Solicitation details

All nine fields are present in the current form. Questions Due and Submission Deadline appear under **Important dates**, rather than inside the procurement subsection.

| Field | UI type | Mandatory as specified? | Validation / notes |
| --- | --- | --- | --- |
| Solicitation / Reference No. | Text | Yes | Non-empty trimmed value required on Save; inline error. |
| Issuing Agency / Department | Text | Yes | Non-empty trimmed value required on Save; inline error. |
| Procurement Contact | Text | Optional | Present; no mandatory save rule. |
| Questions Due | Date | Optional | If supplied, must be a valid calendar date; inline error. |
| Submission Deadline | Date | Yes | Required and must be a valid calendar date; inline error. |
| Submission Method | Dropdown | Yes | PORTAL, EMAIL, and PHYSICAL accepted. UI labels: Online portal, Email, Physical submission. Defaults to Online portal. Email/physical selections reveal corresponding destination fields. |
| Contract Term | Text | Optional | Present. |
| Incumbent Vendor | Text | Optional | Present. |
| Pre-bid Meeting | Dropdown | Optional | To be confirmed, Yes, No. “No” represents the sample “Not required”; the wording differs. |

These rules run on **Save Opportunity**. They do not currently run when Extract Questions is clicked. Production server enforcement is not established by these frontend checks.

## 4. Upload RFP document

| Criterion | Status | Reason |
| --- | --- | --- |
| Upload Document section | Partial | Document-selection area exists, labelled Source questionnaire for Questionnaire and Source document / brief for Generic. It does not perform upload. |
| Drag and drop | No | No application drop handlers/drop zone are implemented. |
| Browse/select from local system | Yes | File input is available after choosing an RFP type, subject to edit permissions. |
| PDF and DOCX supported | Partial | Selection accepts PDF, DOC, DOCX, TXT. This confirms selection support, not parsing/extraction support. |
| Configured format/size limitations | Partial | Extensions and a 25 MiB limit are hardcoded, rather than loaded from configuration. |
| Display document name | Yes, selection only | Selected filename is shown with “(selected)”. A pre-existing saved source name can also be displayed. This is not upload success. |
| Display document size | No | Size is checked internally but not displayed. |
| Display upload status | No | No uploading/success/failure lifecycle. “Selected” is not an upload status. |
| Display page count and Ready status | No | Neither page count nor processing readiness is shown. |
| Persist selected document | No | `selectedFile` is local component state. It is not attached to the opportunity save command and is lost when that component is unmounted. |

## 5. Document validation

| Criterion | Status | Reason |
| --- | --- | --- |
| Supported format validation | Partial | Checks filename extension only. It does not verify MIME type, file contents, or whether a renamed file is a real PDF/DOCX. |
| Maximum file size | Yes, selection | Rejects files larger than 25 × 1024 × 1024 bytes; accepts the limit itself. |
| Empty file rejection | Yes, selection | Zero-byte files are rejected. |
| Availability/readability | No | The selection handler does not read the file contents. Zero-byte rejection alone does not establish readability. |
| Can be processed for extraction | No | No parser/extractor is invoked to establish processability. |
| Appropriate error on invalid selection | Yes | Displays a notice requesting a non-empty PDF, Word, or text file up to 25 MB. |
| Invalid document prevents extraction | No, missing gate | The Extract button is disabled for permissions/read-only state, not missing/invalid file or procurement validation. Clicking it currently only shows an informational toast; no extraction occurs for valid or invalid files. |

## 6. Extract Questions

| Criterion | Status | Reason |
| --- | --- | --- |
| Extract Questions button | Yes, control only | Shown for Questionnaire; hidden for Generic. |
| Validate mandatory solicitation details on click | No | Click handler does not call the solicitation/save validator. |
| Require an uploaded document on click | No | No uploaded-document check and no upload from the UI. |
| Process uploaded document | No | The handler only shows “AI question extraction is currently under development.” |
| Extract questions | No | No real document processing/extraction call is made. |
| Identify section, numbered, and embedded questions | No | No extraction implementation establishes this capability. |
| Display extraction status/progress | No | No extraction job/polling/progress UI is connected. |
| Make successfully extracted questions available for review | No | Existing question editing can display saved questions and accepts manual questions, but real extraction does not populate them. |
| Show the suggested extraction informational message | No | Only the under-development message is shown. |
| Manually add/edit/remove questions | Yes | These controls exist after RFP type selection. |
| Merge questions | No | No merge action is implemented. |

## Integration boundary

The proposed frontend service adapter contains upload, extraction-start, and extraction-status GraphQL calls. Their existence does not constitute a working feature: the form does not invoke them, and matching backend operation implementations were not found in the repository.

Test fixtures also contain simulated upload/extraction behavior. Synthetic results from those fixtures do not satisfy real document-processing acceptance criteria. The current user-facing Extract button does not invoke that simulation either.

## Work remaining

1. Align navigation criteria with the approved Save-only flow; define where users open RFP preparation after saving.
2. Add the requested three-step indicator and explicit completion/unlock rules.
3. Implement persisted document upload, drag/drop, filename/size/status display, and configuration-backed limits.
4. Add content/readability/processable-document validation and an extraction eligibility gate.
5. Connect Extract Questions to mandatory-field validation, uploaded-document validation, extraction processing, and progress/error reporting.
6. Connect extracted questions to review; add merging and the requested informational text.
7. Implement and validate the production upload/extraction backend operations.

## Source evidence

- `frontend/packages/@xts/mfe-opportunity/src/components/RfpPreparation.tsx`: RFP cards, solicitation fields, local file selection, validation, placeholder Extract handler, manual questions.
- `frontend/packages/@xts/mfe-opportunity/src/components/OpportunityFormPage.tsx`: Save-only navigation and opportunity form persistence.
- `frontend/packages/@xts/mfe-opportunity/src/lib/workflow.ts`: mandatory solicitation/date validation.
- `frontend/packages/@xts/mfe-opportunity/src/lib/intakeValidation.ts`: dropdown integrity.
- `frontend/packages/@xts/mfe-opportunity/src/App.tsx`: current routes and local/production service wiring.
- `frontend/packages/@xts/mfe-opportunity/src/services/proposed/createWorkflowService.ts`: proposed upload/extract/status calls.
- `frontend/packages/@xts/mfe-opportunity/src/testing/fixtures.ts`: development-only simulated processing.
