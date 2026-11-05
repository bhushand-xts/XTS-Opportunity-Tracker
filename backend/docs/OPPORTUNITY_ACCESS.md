# Opportunity permissions

The opportunity service checks the active user's role assignments through the
admin service's `roleAccess` and `menus` APIs. Role IDs, names and codes do not
grant access, including Super Admin. No role or permission migration is needed.
Inactive menus and menus under inactive parents do not grant access.

| Operation | Assigned menu permission |
| --- | --- |
| View opportunity records | Opportunities: View |
| View the full pipeline | Pipeline: View |
| View owned/created/assigned work | My Work: View |
| Create opportunities and directory clients | Opportunities: Add |
| Edit opportunities and directory clients | Opportunities: Edit |
| View initial reviews | My Approvals: View |
| Approve, hold or request changes at initial review | My Approvals: Approve |
| View Go/No-Go and estimate review | Gate-2 Approval: View |
| Review Go/No-Go and submitted estimates | Gate-2 Approval: Approve |
| View estimation work | Estimation or Re-estimation: View |
| Submit an in-progress estimate | Estimation: Add, Edit or Submit |
| Upload source documents | Opportunity Add or Edit access as above |

Returned changes at the initial review step still belong to the creator.
Editing remains limited to the existing pending, held and returned-change steps.
Owners cannot change during review; request-change comments remain required.
Workflow transitions retain their existing stage and substage destinations.
The GraphQL `allowedActions` field supplies the frontend's record editing rights.
Client Add and Edit rights are returned separately.
Permissions apply to their own menu only. Opportunities View does not grant
Pipeline View, and My Work/My Approvals Add or Edit does not grant Opportunity
Add or Edit. The sidebar and route guards use the same menu-specific checks.
The `opportunities(queue: ...)` query independently enforces Pipeline, My Work
and My Approvals View permissions; My Work returns only created/owned/assigned
records. Direct API requests cannot bypass a removed queue permission.

`ADMIN_SERVICE_URL` defaults to `http://localhost:4010/graphql`; set it in the
opportunity service environment if admin runs elsewhere. Authorization is checked
once per request and denied if the permission service cannot be reached. Restart
the opportunity service and gateway after deploying the schema changes, and
refresh the frontend. Menu permissions refresh on page load, window focus and
every 30 seconds while signed in.

Regression checks, from `backend/services/opportunity`:

```powershell
npm run build
node --test dist/services/opportunity/src/lib/opportunityAccess.test.js dist/services/opportunity/src/services/opportunity.service.test.js
```

Estimation persistence uses only `tbl_opportunity_estimation` and
`tbl_opportunity_estimation_tracker`. The saved sidebar, viewing, editing,
and CEO submission all read the main table. No legacy records are
imported. Names use the existing `estimation_name` column (500 characters);
allocation, saved rates, person-weeks and USD costs use the four JSONB columns.
No revision column is required: concurrency tokens are derived from creations
and tracker history.

Creating a named estimate inserts exactly one main-table row and adds no tracker record.
There is no stored working copy or unnamed draft row. Editing updates that same ID
and copies exactly one complete previous row into the tracker, with original
rates, names, flags and audit timestamps preserved. Both writes commit together
or roll back together. Estimates have no delete action or delete mutation.
Previously removed records remain hidden for compatibility with existing data.
CEO submission marks the selected main-table estimate with `isselected` and
restores its saved inputs for review. It creates no additional named estimate.
Every active saved estimate has `is_current = TRUE`, including alternatives.
`isselected` defaults to FALSE and becomes TRUE only when the chosen estimate is
submitted to the CEO. Only one estimate per opportunity can be selected; current
and selected are independent flags. Deleted estimates have `is_current = FALSE`.
During pending or held CEO review, the team can save alternatives but cannot
replace or edit the submitted selection; attempts show "Estimation already submitted."
The CEO list, matrix and direct saved-estimate lookup expose only the selected
submitted estimate. Rate updates are limited to that same submitted main-table
row and never insert another main record; its exact previous row is archived once.

Only the Estimation Team can create or edit estimates in Engineering (3/7), pending
CEO review (4/8) and held CEO review (4/9). Submission remains limited
to the Estimation Team. The selected submitted estimate is locked to team edits
through pending and held review; unsubmitted alternatives remain editable.
The CEO can view submitted estimate rates in every later workflow stage. Phase and
role selectors are hidden for the CEO. Rate editing is available only in pending or
held CEO estimation review (4/8, 4/9); rates are read-only after approval.
The CEO can edit billing rates for the selected submitted estimate with
the rate-only mutation and Update estimate button. The main row's
`rate_snapshot.roles` stores billing rates by technical role code, including rate,
billing period and USD currency. Costs are recalculated on the server, and exactly
one complete previous named row is archived. Neither this mutation nor resource
editing changes `mst_rate`; resource edits preserve existing opportunity rates.
Approval remains CEO-only. Approval, closure and a
pending negotiation revision request lock editing. USD is independent of the
opportunity's client-budget currency; saved rates are preserved on edit.

Fresh installations use
`database/migrations/20261103_opportunity_estimation_persistence.sql` for the
main/tracker tables and indexes. It neither imports nor deletes existing data.
Existing installations apply `20261104_estimation_single_row.sql` after earlier
migrations. It archives and removes redundant internal copies, recovers a lone
old draft as a named estimate, and sets the current flag independently of selection.
It removes the old unique-current index and equality constraint, preserves existing
tracker rows unchanged, and adds no duplicate history when rerun.
The PostgreSQL integration test is opt-in via `ESTIMATION_DB_TEST=true` and uses
connection-local temporary tables only.
