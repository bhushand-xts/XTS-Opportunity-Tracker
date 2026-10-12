# Verification and limitations

Verified 2026-10-12. Actual branch OT-15-Opp-Creation and existing uncommitted work
were preserved. No push, merge, deployment or database/menu mutation ran.

## Checks

- `npm test -- --reporter=dot`: **20 passed**, 3 files. All business workflow tests
  inject test-only services, never real production fallback data.
- Opportunity and app-shell type checks passed.
- ESLint for new Opportunity/API-contract sources and the modified sidebar passed.
- Production builds passed with bundle-size warnings. Optional missing frontend/.env
  uses existing .env.example defaults. Final builds also check shared Sonner so
  remote toast calls and the design-system Toaster resolve the same toast store.
- Proposed schema/exhaustive documents and each optional Apollo operation validate
  together. No unsupported operation is submitted to the live schema.
- git diff --check passed.

## Real reads verified

Gateway 4000/admin 4010 responded. The initial implementation check used menu 12
(historical single-record verification). Menu 12 is active Opportunities, key opportunities,
icon ListChecks, routePath null. availablePermissionsForMenu returned exact codes
add/approve/delete/edit/export/import/reject/view. currencies, industries and
accountTypes returned real data. This establishes menu definitions and master reads,
not any particular user's assignment/approval rights. No real business mutation ran.
After the user's correction, a fresh menu 5 read returned active Permission Master,
key `permission_master`, icon `Key`, routePath
`/admin/menu-management/permission-master`, with the same eight permission codes.
The temporary ID-5-only implementation denied this conflicting route; that
implementation has been superseded by dynamic menu discovery.
The latest `menus(asTree: false)` read identifies active 12 / Opportunities
(`opportunities`, null route) and 29 / Opportunity Management
(`opportunity_management`, `/opportunities`), both connected through actual role
grants. Inactive 28 / Opportunity Tracking and Administration's 5 / Permission Master
are excluded. No database/menu mutation ran. These metadata reads and the prior
workflow/visual checks do not establish any particular signed-in user's grants.
The live gateway has no Opportunity type or workflow operations. Source service
4003 was unavailable and its repository remains an empty-array stub. The production
UI therefore reports Pipeline unavailable instead of claiming a successful empty list.

## Fixture-only tests

Verified successful empty list versus missing-integration error; sibling card/edit
and Overview routes; approval-only review route; persistence-before-navigation;
new creation followed by same-ID Save & Continue; in-flight duplicate suppression;
failed-save input retention; independent unsaved-answer retention on both save
buttons; restricted estimation hidden on Overview; required rejection reason and
reviewed-package confirmation; stage/assignment/active-user/independent-reviewer and
current submitted-revision checks; draft Pending excluded from decisions; stricter
readiness than Pending saves; all 12 proposal sections; calendar-valid date-only
strings; exact decimal matrix calculations; proposed GraphQL schema validity.
Creation keyboard-select test is slow in jsdom (roughly 32?56 seconds), so that
single interaction test has an explicit timeout. No tests are skipped in the final
suite. Actor/reviewer fixture IDs are synthetic and confined to testing/visual files.

## Visual checks

Isolated harness uses the real shared AppShell/shadcn UI, test records and a dedicated
browser profile. Captured **33 scenarios** at 1440?1000, 1024?900 and 390?844: Pipeline,
New, Questionnaire, Generic, Details, Sales review, CEO review, and matching views
from all three authoritative reference HTML files. Zero detected horizontal page
overflow and zero runtime exceptions. Desktop Generic app/reference captures were
visually inspected, followed by heading-icon and duplicate-client-heading refinements.
The existing host sidebar/header was retained. Intake/Overview content uses violet,
indigo and teal panels, status colours, the reference hierarchy and responsive stacks.
Actions remain after all RFP/response content. Only estimation tables scroll horizontally.

Artifacts: `visual/dist/verification/report.json` and PNGs in the same ignored build
folder. The harness source and reproduction instructions remain in visual/.
Node browser spawn and direct Edge were blocked; direct hidden Chrome worked and
was closed by the verifier, along with its temporary loopback server.

## Missing APIs / test access

Real create/update/reopen persistence, client/contact CRUD, upload/extraction jobs,
eligible/multi-role tenant directory, response/assignment/module persistence, immutable
review-package submission, Sales-to-CEO transitions and Go/No-Go persistence remain
blocked by the missing workflow APIs. Backend repeated/stale decision rejection,
tenant/redaction authorization and cross-user updates are not verified. No subscription
or live cross-user synchronization is implemented or claimed. UI/interface logic and
schema documents must not be represented as working deployed business behavior.

Keyboard select is tested and Tabs/Sheets/Dialogs reuse existing Radix primitives;
full browser focus/screen-reader behavior and browser Back cancellation have not
been exhaustively tested. Proposed base64 upload transport requires gateway body-size/
streaming agreement before 25 MB uploads can work; current express.json defaults are
insufficient. See graphql-contract.md for identity, tenant, version, idempotency,
redaction, readiness and invalidation requirements for each backend operation.

## Current dynamic menu integration checks

The fixed menu ID has been removed from production sidebar/access code. The
shared GetOpportunityMenus query reads menus(asTree:false), and both consumers
resolve the same active Opportunity records and actual permission keys. Current
local records 12 and 29 are accepted; inactive 28 and admin 5 are excluded. If 28 is activated
or the IDs differ in another environment, discovery works without an ID change.
One sidebar surface selects the first authorized record's real label/icon; workflow
permissions consider all matched active records and still require backend record actions.

Eight focused tests passed: catalog discovery, numeric-ID independence, activation,
admin/other-route exclusion, inactive ancestor/cycle exclusion, actual-key grants,
canonical deep routes and plural alias preservation of query/hash. Opportunity and
app-shell type checks, edited-source lint and both production builds passed. Builds
retain the documented bundle-size warning. The earlier 20 workflow tests and 33 visual
captures above are historical verification, not rerun claims for this menu change.
