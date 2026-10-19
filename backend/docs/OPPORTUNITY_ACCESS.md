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
