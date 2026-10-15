# Opportunity implementation audit

Inspected 2026-10-12. All three authoritative HTML references were read (markup, scoped visual styles, intake/workspace/response/decision renderers). No repository AGENTS.md or GraphQL codegen configuration was found.

## Repository state

Actual branch: `OT-15-Opp-Creation`, not the request's contextual `feature/opportunity-gate1-flow`. Existing changes include the Opportunity setup, shell integration, design-system navigation and untracked reference HTML. Preserve all of these; do not reset, push or switch branches.
Latest requested integration: connect all real available Opportunity menus. Discover existing records through `menus(asTree: false)` and match their Opportunity menu keys, names or routes. Active authorized records feed one sidebar entry, and access checks consider their actual menuKey grants. The local gateway identifies active **12 / Opportunities** and **29 / Opportunity Management**; **28 / Opportunity Tracking** is excluded while inactive and **5 / Permission Master** remains an Administration record. No fixed ID, duplicate menu or database mutation is required. The canonical MFE route is `/opportunity`, with `/opportunities` supported as an alias.

Expected backend workflow (not implemented by the unchanged backend): saving immediately returns **Pending** (`SALES_REVIEW`)
in the configured Sales Head's My approvals. The owner can edit while Pending;
each save refreshes the reviewed package/revision. Sales Head approves from
Overview and atomically routes to the configured CEO in Gate 1 pending, then CEO
records Go / No-Go. No manual submission, approver picker or completed/validated
response prerequisite remains. Real approvers are resolved by backend configuration,
without frontend user-ID constants; stale and wrong-role decisions are rejected.

## Relevant sources

- `frontend/packages/@xts/mfe-opportunity/src/{App,bootstrap}.tsx`: standalone/host-aware router and layout; remote exposes `./App`, port 3002.
- `frontend/packages/@xts/app-shell/src/App.tsx`: `/opportunity/*` federated route, lazy remote.
- `frontend/packages/@xts/design-system/src/components/AppShell.tsx`: shared sidebar, header and menu lookup.
- `frontend/packages/@xts/design-system/src/{lib/auth.ts,lib/auth.queries.ts,styles/globals.css,components/ui}`: real login/session, roleAccess map, semantic tokens, shadcn primitives. `can()` is a legacy unconditional module check; do not use for business authorization.
- `frontend/packages/@xts/api-client/src/apolloClient.ts`: singleton Apollo, gateway GRAPHQL_API_URL, Bearer session transport, InMemoryCache.
- `frontend/packages/@xts/mfe-admin/src/features`: per-feature gql operation files, manual API types, cache-and-network reads, react-hook-form/Zod forms and sonner notifications.
- `backend/services/opportunity/src`: Opportunity GraphQL/repository stub, **not persistence**.
- `backend/services/admin/src`: real SQL-backed menu/access/master-data services; proposalSections repository is also a stub.
- `backend/services/user/src/repositories/user.repository.ts`: SQL-backed userList, **single role per user**; no eligible-user or multi-role directory.
- `backend/gateway/src/{middleware/auth.middleware.ts,graphql/gateway.ts}` and admin `graphql/context.ts`: verified user ID forwarded by gateway; current admin direct-call actor fallback must not be adopted for new workflow operations.

## Existing operations and status

| Operation | Repository implementation | Opportunity usage |
|---|---|---|
| menus(asTree: false) | SQL-backed admin | discover all active Opportunity records; use authorized metadata and reject conflicting module routes |
| roleAccess(roleId), availablePermissionsForMenu(menuId) | SQL-backed admin | existing useAuth().hasPermission/hasMenuAccess |
| currencies, industries, accountTypes | SQL-backed admin master data | form/client master selections, stable IDs |
| rfpQuestionsList | SQL-backed admin master | active Question Master templates imported as independent editable questions; numeric masterQuestionId retained, duplicate imports suppressed |
| rateMasters | SQL-backed admin master | available rate catalog; hourly conversion policy still required before connection |
| userList, rolesList | SQL-backed user/admin services | user-authorized active Opportunity owner directory with stable ownerId and display roles; inactive current owner remains visible, no approval/reviewer eligibility inferred |
| opportunityList | repository.findAll() returns [] literally; id-only schema | NOT called: would present a false empty Pipeline |
| proposalSectionsList | repository.findAll() returns [] literally; id-only schema | NOT called; static reference section catalog is UI structure, not fake business records |
| create/update/detail opportunity, client/contact CRUD, upload/extraction, queues, assignments, response reviews, scope/estimate persistence, automatic approval routing/decisions | absent | typed proposed contracts; real GraphQL adapter selected by default; unchanged backend remains unavailable; no error-triggered mocks |

No API behavior is runtime-verified merely from its source. Local backend/authenticated test access will be checked separately during verification.

## Permissions and integration boundaries

Existing admin screens use exact lower-case `view`, `add`, `edit` permissionKey codes and stable menuKeys. Opportunity obtains keys from all matching active records and uses their exact configured grants; incompatible module routes are excluded. There is no fixed menu ID or authorization key, role-name/role-ID matching or Admin approval bypass. Backend action lists and visible modules are REQUIRED for record/tab-sensitive operations; absence defaults to denied. Global create uses the existing `add` grant only. Additional business action codes are proposed contract enums, not assumed existing database grants. Backend must enforce identity, active users, tenant scope, record assignment, stage, revision and independent reviewer.

There is no implemented client directory, upload, extraction or approval service in this repository, no subscriptions, no eligibility filtering, no multiple-role user model and no scoped opportunity query. Shared dashboard mock-data and SSO fabrication are excluded from this feature. Production never substitutes fake data after errors. Test-only service fixtures verify UI and contract behaviors.

## Field inventory and sequence

Field inventory is in `field-mapping.md`: all reference opportunity/client/contact/solicitation/date/context/generic/questionnaire/response/module fields, including 12 original/restored proposal sections. Address and streetAddress remain separate, with no address line 2. Money uses decimal strings; date-only strings never pass through UTC conversion.

1. Audit and isolate unavailable workflow APIs; establish typed service and GraphQL handoff.
2. Dynamic Opportunity menu discovery and permission-driven sub-navigation, deep-linkable routes.
3. Scoped reference UI: Pipeline, two-column intake, client/context drawers.
4. Shared response workspace, read-only Overview and saved module tabs.
5. Atomic Pending save/configured approval routing, revision-aware preparation adapters and Overview decision controls.
6. Tests of real UI through test-only adapters; typecheck/lint/build and visual viewport checks; distinguish missing live behavior.

## Read-only local gateway verification

The gateway on localhost:4000 and admin service on 4010 responded successfully.
The initial implementation verification used menu 12 (historical single-record
verification, before dynamic discovery):
`menu(menuId:12)` returned active `Opportunities`, key `opportunities`, icon
`ListChecks`, and null routePath. The route-to-MFE binding is intentionally in
application navigation; no database mutation was performed.
`availablePermissionsForMenu(menuId:12)` returned exact codes `add`, `approve`,
`delete`, `edit`, `export`, `import`, `reject`, `view`. The sidebar queues use
view for My Work and approve OR reject for My Approvals. Decisions still require
record-specific backend actions, assignment and stage; menu approve is not a
business approval by itself. These are verified menu definitions, not proof of
any particular signed-in user's grants.

After the user's correction, a fresh `menu(menuId:5)` read returned active
`Permission Master`, key `permission_master`, icon `Key`, and routePath
`/admin/menu-management/permission-master`. Its permission definitions are the
same eight codes listed above. The temporary ID-5-only implementation denied this
conflicting route. That implementation is historical and has been superseded by
dynamic discovery. No menu record or role assignment was changed.

The latest `menus(asTree: false)` read returned active menu **12 / Opportunities**
(`opportunities`, null route) and **29 / Opportunity Management**
(`opportunity_management`, `/opportunities`). Both are connected through their
actual role grants. Menu **28 / Opportunity Tracking** (`opportunity_tracking`,
null route) is inactive and excluded. Menu **5 / Permission Master** is excluded
as an Administration record. These reads establish available menu metadata, not
any particular user's access.

The composed live gateway schema currently has **no Opportunity type or
opportunity/client/document/answer/approval workflow operations**. The source
opportunity service is not running on 4003. Master reads currencies, industries
and accountTypes responded with real data. No authenticated business persistence
or decision was exercised. Existing userList is SQL-backed but lacks tenant and
eligibility filters. The initial audit did not connect it. The subsequent
user-authorized integration uses active `userList` records for Opportunity owner
selection and `rolesList` for display; it does not replace the missing
reviewer/approver eligibility API or authorize by role names.

The latest master-data reads returned **5 active RFP question templates**,
**16 active users** and **9 active roles**. Questionnaire's Add from Question
Master imports independent editable copies with numeric `masterQuestionId`, unique
draft IDs, `sourceReference: Question Master #id` and `validated: false`; repeated
imports of the same master are suppressed. Real opportunity save remains
unavailable. No personal identities are included in this audit.
