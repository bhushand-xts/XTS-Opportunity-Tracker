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
| `mfe-opportunity`, `mfe-solution`, `mfe-approval`, `mfe-dashboard` | Placeholders for later. Not loaded by the shell yet. |

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
| Red "Couldn't load …" banner, and a CORS error in the browser console | The gateway must allow the frontend origin. `CORS_ORIGIN` in `backend/gateway/.env` defaults to `http://localhost:3000,http://localhost:3001`. Restart the gateway after changing it. |
| "Failed to fetch" | The gateway isn't running on port 4000, or `GRAPHQL_API_URL` is wrong. |
| "Loading module…" never ends inside the app | `npm run dev:admin` isn't running (port 3001). |
| Blank page or no sidebar after an update | An old login is stored in the browser. Hard-refresh (`Ctrl+Shift+R`); if it persists, run `localStorage.clear()` in the browser console and reload. The app now clears a stale login by itself and shows the login screen. |
| "Please sign in with a registered account to make changes" | You are signed in with the demo SSO button. Log out and use a real account. |
| "Port 3000 is already in use" | Another copy of the app is running. Stop it, or close the old terminal. |
