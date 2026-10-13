# Generic RFP and Responses acceptance report

Reviewed: 13 October 2026.

Scope: the attached Generic RFP AC01–AC12 document and the response acceptance criteria in the message, compared with the current Save Opportunity / Cancel flow. Separate intake navigation, upload/extraction processing, and removed Continue actions are excluded from the coverage assessment as requested. This is a source review; no application code was changed.

“Covered” refers to current UI/local-workflow behavior, subject to permissions. Production workflow persistence/integration is still incomplete and is not certified by this report.

## Generic RFP attachment

| Criterion | Current-flow assessment | Explanation |
| --- | --- | --- |
| AC01 — Generic RFP selection | Covered | The Generic card is highlighted and has selected/pressed state. Only one type is stored. Save Opportunity and Cancel are the current actions; Continue is excluded. |
| AC02 — separate intake navigation and stepper | Excluded | The app uses the existing opportunity workspace. Separate intake steps and the removed Continue flow are outside the present implementation. |
| AC03 — solicitation details | Covered for implemented options | Reference number, issuing agency, procurement contact, questions due, submission deadline and submission method are present. Method choices are Online portal, Email and Physical submission. The optional example “Other” is not a current option. |
| AC04 — date validation | Partial | Native date inputs and calendar-validity checks exist, with inline errors. Submission Deadline is mandatory. **Questions Due ≤ Submission Deadline is not checked.** |
| AC05 — persisted upload and upload/readiness display | Excluded | Real document upload is outside the current flow. Local file selection and selected filename are available; they are not persisted upload. |
| AC06 — file validation | Covered for current selection; processing excluded | Selection rejects unsupported extensions, empty files and files larger than 25 MiB, and shows an error. Content/corruption/readability checks depend on an upload/processing flow that is excluded here. |
| AC07 — proposal requirements | Covered | Generic RFP exposes Submission format and Evaluation basis / criteria. Choices are Technical + Cost volumes and Single combined proposal. Output format and page-rule fields are also present. |
| AC08 — required proposal sections | Partial | All eight listed sections are available, plus four others. Checkboxes support selecting, deselecting and multiple selections, with instructions for each selected section. **The catalog is hardcoded; it is not loaded from a master.** Local saving creates section response items from the selected sections. |
| AC09 — at least one section before proceeding | Excluded as a continuation gate | There is no Proceed/Continue action. Save currently permits zero sections because RFP preparation remains optional. Requiring a section on Save would be a new rule, not an implemented condition. |
| AC10 — Continue to proposal outline | Excluded as navigation | No separate Continue/Outline screen exists. The applicable save behavior does retain the Generic type, solicitation values, proposal format, evaluation text and selected sections in the saved form/local workflow. Selected file bytes and file size are not persisted. |
| AC11 — Back to previous intake step | Excluded | There is no previous-step intake screen. Back to Pipeline exists and uses the unsaved-change protection; it is not a previous-step action retaining an unsaved intake draft. |
| AC12 — Cancel | Covered | Cancel asks for confirmation when unsaved changes exist and returns to Pipeline if confirmed. The dialog uses the shared discard-unsaved-changes wording rather than the sample custom dialog. |

## Responses criteria applicable to the current flow

| Criterion | Assessment | Explanation |
| --- | --- | --- |
| 1 — extraction-triggered navigation | Excluded | Automatic extraction/navigation is outside the implemented flow. Responses are accessed through the saved opportunity workspace or permitted details/assignment views. |
| 1 — associated opportunity information | Covered, with placement differences | The details page displays opportunity number/title, client, value, owner and submission deadline. The edit workspace heading shows saved opportunity identity; response items carry that opportunity's ID. This is not a separate extraction-results header. |
| 1 — extracted question/section totals | Excluded as extraction metrics | Current counts describe prepared questions/selected sections or response items, not verified extraction results. They should not be labelled “questions extracted.” |
| 2 — question summary | Partial | Preparation shows `Questions · N` and Generic selected-section count. Details Overview shows total visible response items and current approved revisions; the deadline appears in the details header strip. There is no single Questions extracted / Answered / Deadline summary, and no draft-plus-final answered count. Response-item totals can include both sections and questions. |
| 3 — structured question list | Partial | Preparation lists numbered manual/saved questions and editable text. The response workspace lists permitted question/section text, status badge and owner; selecting an item opens its answer and actions. **Response-workspace items do not display question numbers.** Lists are permission-scoped, so they do not promise all opportunity questions to every user. |
| 3 — statuses, response fields and actions | Covered | States include Unassigned, Assigned, Draft, Submitted, Approved and Changes requested. Available actions depend on permissions/stage/assignment and include Save assignment, Save draft, Submit to reviewer, Approve response and Request changes. |
| 4 — manually add a question | Covered using the current inline flow | + Add question creates an inline editable entry in RFP preparation; it appears immediately and increases the question count. Save Opportunity persists question changes in local mode and creates a response item. Remove question is supported with confirmation. |
| 4 — popup and category selection | Outside current flow | There is no Add Question popup or per-question section/category selector. Generic proposal-section selection is separate and does not categorize manually added questions. |
| 4 — optional owner assignment | Covered as a subsequent action | After the opportunity/question is saved, the response workspace supports owner, independent reviewer and due-date assignment through Save assignment. Assignment is not part of the Add Question entry itself. |
| 5 — response progress | Partial | Per-item states and total/current-approved counts exist. **No overall completion percentage or aggregate Final / Draft / Assigned-Pending / Not Started counts are displayed.** The existing Opportunity progress panel tracks Sales/CEO approval stages, not response completion. |
| 6 — Review & Save Opportunity button | Outside current flow | This button does not exist. Save Opportunity saves opportunity/RFP form data; Save assignment, Save draft, Submit and review actions save response data separately. |
| 6 — retain saved questions, assignments, responses and statuses | Covered in the local workflow, with revision rules | Saved response data remains associated with the opportunity. Unchanged question/section items retain their response data. Changing source text/instructions can invalidate response approval/submission state and increment revisions; this is deliberate behavior, not unconditional status preservation. Unsaved answers are protected and are not silently saved by Save Opportunity. |
| 6 — navigation to details after saving | Outside current flow | Ordinary Save Opportunity returns to Pipeline. If an answer/assignment remains unsaved, it keeps the user in the workspace with a notice. It does not automatically navigate to details. |
| 6 — return to response work from opportunity | Covered subject to permissions | Edit Opportunity / the Pipeline Continue link reopens editable work. Details Assignment embeds the response workspace where permitted. Review Responses displays saved read-only response information. |

## Applicable gaps to consider

These concern existing features, rather than the excluded intake/extraction flow:

1. Validate Questions Due against Submission Deadline if AC04 remains required.
2. Load proposal sections from configured master data if AC08 remains required.
3. Add response-item numbers if required in the response workspace.
4. Add a combined question/answered/deadline summary and response completion totals/percentage if required for the existing workspace.

Per-question category selection would be an additional feature. Requiring a proposal section on Save would be a new save rule. Neither was added by this review.

## Source evidence

- `frontend/packages/@xts/mfe-opportunity/src/components/RfpPreparation.tsx`: Generic selection, procurement/date fields, proposal choices, selected sections, file-selection checks, numbered manual questions and counts.
- `frontend/packages/@xts/mfe-opportunity/src/lib/workflow.ts`: hardcoded section catalog, response labels and date checks.
- `frontend/packages/@xts/mfe-opportunity/src/components/ResponseWorkspace.tsx`: permission-scoped response list, assignments, draft/submission/review actions and unsaved-change protection.
- `frontend/packages/@xts/mfe-opportunity/src/components/OpportunityDetailsPage.tsx`: identity/deadline header, saved response totals, reviewed responses and Assignment view.
- `frontend/packages/@xts/mfe-opportunity/src/components/OpportunityFormPage.tsx`: separate form/response saves and Save-only navigation.
- `frontend/packages/@xts/mfe-opportunity/src/components/PipelinePage.tsx`: return-to-work and details navigation.
- `frontend/packages/@xts/mfe-opportunity/src/testing/fixtures.ts`: local saved section/question response generation and revision preservation/invalidation.
