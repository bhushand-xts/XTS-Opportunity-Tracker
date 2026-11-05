# XTS Opportunity Tracker — Frontend

React + TypeScript micro-frontends, styled with Tailwind and the shadcn/Radix
components in the design system. It talks to the backend through the GraphQL
gateway (`http://localhost:4000/graphql`).

## Structure

Everything lives in `packages/@xts/`. One `npm install` in this folder installs all of it (npm workspaces).

| Package | What it is |
|---|---|
| `app-shell` | The host app (port **3000**): login, sidebar, header, routing. Loads the other MFEs on demand. |
| `mfe-admin` | Administration screens (port **3001**): menus, permissions, roles, role access. |
| `design-system` | Shared UI: shadcn components, `AppShell`, `LoginView`, auth store, Tailwind tokens. |
| `api-client` | The Apollo Client — gateway URL, auth header, cache. |
| `api-contracts` | TypeScript types that mirror the backend's GraphQL types. |
| `mfe-opportunity` | Opportunity workspace (port **3002**), loaded by the shell at `/opportunity`. |
| `mfe-solution`, `mfe-approval`, `mfe-dashboard` | Placeholders for later. Not loaded by the shell yet. |

Inside `mfe-admin/src/features/` each screen has the same layout:

```
role-management/
  RoleMasterPage.tsx     the page (table + actions)
  RoleFormDialog.tsx     add / edit dialog
  role.queries.ts        the GraphQL documents
  role.schema.ts         form validation (zod)
  useRoles.ts            data hook
  useRoleMutations.ts    create / update / delete hook
```

## Run it

You need the backend running first — see `backend/README.md`. At minimum: the
**user** service (4001), the **admin** service (4010) and the **gateway** (4000).

**1. Install (once, and again whenever a `package.json` changes)**

```powershell
cd D:\OT-Lead\frontend
npm install
```

**2. Start the two apps — two terminals, both from `frontend\`**

```powershell
# Terminal 1 — the admin screens
npm run dev:admin

# Terminal 2 — the app shell
npm run dev:shell
```

These are shortcuts for:

```powershell
npm run dev --workspace=packages/@xts/mfe-admin
npm run dev --workspace=packages/@xts/app-shell
```

Wait for `compiled successfully` in both (the first build takes about 30 seconds).

**3. Open http://localhost:3000**

Create an account (**No account yet? Create one**) or log in, then use
**Administration** in the sidebar.

Both apps must be running: the shell loads the admin screens from port 3001.
`http://localhost:3001` also works on its own, with the same sidebar and
header, but always **use http://localhost:3000** — it is the real app.

## Screens (Administration)

| Screen | What it does | Backend operations |
|---|---|---|
| Overview | Counts and links | `rolesList`, `menus`, `permissions` |
| Menu Master | Add / edit menus, set parent, turn on or off | `menus`, `createMenu`, `updateMenu`, `toggleMenuStatus` |
| Permission Master | Add / edit permissions, turn on or off, view the change history | `permissions`, `permissionHistory`, `createPermission`, `updatePermission`, `togglePermissionStatus` |
| Menu Permission Mapping | Choose which permissions each menu allows | `menuPermissions`, `menuPermissionMappings`, `saveMenuPermissions` |
| Role Master | Add / edit / delete roles, view the change history | `rolesList`, `roleHistory`, `createRole`, `updateRole`, `deleteRole` |
| Role Menu Permission Assignment | Pick a role, pick a menu, tick its permissions (works for any number, with a filter); the menu list shows how much each menu is granted; save all changes at once | `roleAccess`, `menuPermissionMappings`, `addRoleMenuPermissions`, `removeRoleMenuPermissions` |
| User Role Assignment | Lists every user and lets you give each one role (or none) | `userList`, `rolesList`, `assignUserRole` |

Set things up in this order: **Permissions → Menus → Menu Permission Mapping →
Roles → Role Menu Permission Assignment → User Role Assignment.** A role can only be given a
permission that has been mapped to that menu.

Changes are recorded against your user id (`createdBy` / `updatedBy`), so use a
real account. The demo **Login with SSO** button has no user record and cannot
save changes.

**History:** Role Master and Permission Master have a clock button on each row.
It shows every change to that record, newest first, with who made it and which
fields changed. It reads the `mst_roles_tracker` / `mst_permissions_tracker`
tables, which the backend fills in on every change (a deleted role keeps its
history).

**Limits** follow the database columns: role name 100, role code 50, role
description 100; menu name 100, key 100; permission name 100, key 100,
description 500. Keys use lowercase letters, numbers, `-` and `_`
(e.g. `test_menu`).

## Other commands

| Command | Does |
|---|---|
| `npm run type-check` | TypeScript check of every package |
| `npm run lint` | ESLint |
| `npm run build` | Production build of every package |
| `npm run storybook --workspace=packages/@xts/design-system` | Browse the design-system components |

## Configuration

The gateway URL defaults to `http://localhost:4000/graphql`. To point somewhere
else, copy `.env.example` to `.env` in this folder and set `GRAPHQL_API_URL`,
then restart both apps (it is read at build time).

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| Red "Couldn't load …" banner, and a CORS error in the browser console | The existing gateway must allow the frontend origin. Its default origins are `http://localhost:3000,http://localhost:3001`; standalone Opportunity on 3002 requires that origin to be allowed already. Use the shell on 3000 for the existing configuration. |
| "Failed to fetch" | The gateway isn't running on port 4000, or `GRAPHQL_API_URL` is wrong. |
| "Loading module…" never ends inside the app | `npm run dev:admin` isn't running (port 3001). |
| Blank page or no sidebar after an update | An old login is stored in the browser. Hard-refresh (`Ctrl+Shift+R`); if it persists, run `localStorage.clear()` in the browser console and reload. The app now clears a stale login by itself and shows the login screen. |
| "Please sign in with a registered account to make changes" | You are signed in with the demo SSO button. Log out and use a real account. |
| "Port 3000 is already in use" | Another copy of the app is running. Stop it, or close the old terminal. |

## Opportunity MFE

From `frontend/`, run `npm run dev:opportunity` in its own terminal alongside
`npm run dev:shell`. Open http://localhost:3000 and select **Opportunity** in the
sidebar. The entry discovers existing Opportunity records through `menus(asTree: false)`
using their menu keys, names and routes. Active records with role access feed one
sidebar entry; the name and icon come from an authorized record. Role Menu Permission
Assignment controls each record's actual `menuKey`, and Opportunity access checks
consider grants across all matching active records.
On the local gateway checked on 2026-10-12, active **12 / Opportunities** and
**29 / Opportunity Management** are connected. **28 / Opportunity Tracking** is
excluded while inactive, and **5 / Permission Master** belongs to Administration.
The MFE opens at `/opportunity`; `/opportunities` is supported as an alias.
No fixed menu ID, duplicate menu or database change is required.

For standalone development, open http://localhost:3002; the app provides the
same authentication, sidebar, header, and `/opportunity` routing as the shell.
The MFE uses the real workflow GraphQL adapter by default with the existing login,
signed-in user's role and Bearer token. Set `OPPORTUNITY_USE_LOCAL_WORKFLOW=false` in
`frontend/.env` for backend workflow testing, then restart the dev servers. No additional
workflow API flag is required. The same routes and screens use the configured
`GRAPHQL_API_URL`; a failed request never substitutes synthetic data.

The frontend is prepared for **Save -> Pending -> Sales Head approval -> Gate 1
pending -> CEO Go / No-Go**, with decisions directly on **Overview** and no manual
submission/approver picker. Expected backend routing uses real active eligible
Sales Head/CEO users and returns `approvalAssignees`; the frontend never invents
assignee IDs or authorizes a decision through a role display name. Owner Pending
edits must refresh package/revisions, and stale or wrong-user decisions must fail.
Question/answer completion is not an approval prerequisite.

**The unchanged backend does not implement the required workflow APIs yet.** The
prepared contract is in `../docs/opportunity/graphql-contract.md`. Real saving,
cross-user queues, stage transitions, assignments and decisions cannot work until
that backend contract is confirmed and implemented. Current login, menus, user/
role directories and master reads remain real; unsupported workflow requests show
errors instead of fabricated success. Backend source changes were reverted; no database migration or business writes were applied.
Temporary ignored backend environment settings still require restoration from their original backup.

To validate the existing screens with actual users before workflow APIs are ready,
set `OPPORTUNITY_USE_LOCAL_WORKFLOW=true` in `frontend/.env` and restart the MFE.
The role switcher is removed: use normal login/logout in the same browser profile
and app address. Login identity, active users/roles, Opportunity menu grants and
masters come from the existing gateway. Only workflow/client records are local.
The local Pipeline starts empty; use the clearly labelled UI Test Client or add
a local test client. Previously seeded synthetic opportunities are not imported.

1. Sign in as Sales Representative and save a new Opportunity: Pipeline shows Pending.
2. Sign out and sign in as Sales Head. Open My Approvals and the opportunity's
   Overview. Approve & Send to CEO, or reject with a reason.
3. After Sales approval, sign in as CEO and open My Approvals. Approve Go or
   Decide No-Go with a reason. Decisions appear above Opportunity Progress.
4. Sign back in as Representative and verify the same record's Pipeline status.

Eligible Sales Head/CEO users share their stage queue; the first valid decision
advances it. Writes refresh real identity and grants and reject stale revisions.
Local records survive logout but do not sync across browser profiles/devices or
origins (ports 3000 and 3002 have separate storage). This verifies frontend UI
behavior using actual accounts, not backend persistence or server authorization.
Document upload/extraction still requires backend implementation. Production
builds always ignore this development flag. Set it false to use the same UI with
the documented workflow API once the backend contract is implemented.

Use `OPPORTUNITY_REMOTE_URL` to override the default remote origin when building
the shell and Opportunity MFE. Build with
`npm run build --workspace=@xts/mfe-opportunity`.
