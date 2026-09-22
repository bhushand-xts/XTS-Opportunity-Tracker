# GraphQL API reference

Generated from the code in `gateway/`, `services/user`, `services/admin`, `services/opportunity`.

| URL | What it is | Operations |
|---|---|---|
| http://localhost:4000/graphql | **Gateway** — one endpoint, composes `user` + `admin` (default `ENABLED_SUBGRAPHS=user,admin`) | everything in 4001 + 4010 |
| http://localhost:4001/graphql | **User service** (direct) | 3 queries, 3 mutations |
| http://localhost:4010/graphql | **Admin service** (direct) | 20 queries, 12 mutations |
| http://localhost:4003/graphql | Opportunity service (direct; not in the gateway by default) | 2 queries | 

Use **4000** from the frontend. Use 4001 / 4010 to test one service on its own.

## How to call

**Browser:** open the URL. Apollo Sandbox loads — paste a query on the left, press Run.

**PowerShell:**

```powershell
$body = @{ query = 'query { rolesList { id roleName isActive } }' } | ConvertTo-Json
Invoke-RestMethod -Uri http://localhost:4000/graphql -Method Post -ContentType 'application/json' -Body $body
```

Every request is `POST` with JSON `{ "query": "...", "variables": { ... } }`.

Notes that apply everywhere:

- **Who is signed in comes from the login token.** Send the token `login` / `register` returned as `Authorization: Bearer <token>`. The gateway checks it with the user service and passes the user's id on to the other services.
- **`createdBy` / `updatedBy` are optional.** When you are signed in, the backend records **your login user id** as created-by / updated-by — even if you type a different `createdBy` (you cannot sign someone else's name to a change). Without a valid token it falls back to the `createdBy` / `updatedBy` you send; with neither, the change is refused with "You must be signed in to make changes."
- Operations are not blocked for anonymous callers (only changes that need an author are refused), and an unreachable user service just means "not signed in".
- In **Apollo Sandbox**: run `login`, copy the `token`, then add the header `Authorization` = `Bearer <token>` in the Headers tab. After that you can leave `createdBy` / `updatedBy` out.
- Errors for menus / permissions / access come back with `extensions.code` = `NOT_FOUND` (message contains "not found") or `BAD_USER_INPUT`.
- Every service also exposes a dummy `_empty: String` field on Query and Mutation. Ignore it.
- Date fields (`createdDt`, `updatedDt`) come back as **epoch milliseconds in a string**, e.g. `"1789619907112"`. Convert with `new Date(Number(value))`.

---

## User service — 4001 (also available on 4000)

### Queries

| Query | Arguments | Returns | Use |
|---|---|---|---|
| `userList` | — | `[User]` | Every user, with `roleId` (the one assigned role, or `null`) and `isActive`. Sorted by name |
| `usersByRoleCount` | `roleId: Int!` | `Int!` | How many users have this `role_id` (active or not). Admin calls it before deleting a role |
| `currentUserId` | — | `Int` | The id of the signed-in user (from the `Authorization` token), or `null` if not signed in |

```graphql
query { userList { id firstName lastName email roleId isActive } }

query { usersByRoleCount(roleId: 1) }
```

### Mutations

| Mutation | Arguments | Returns | Use |
|---|---|---|---|
| `register` | `firstName, lastName, email, password` (all `String!`) | `AuthPayload!` `{ token, user }` | Create an account and log in. Email must look valid, password ≥ 8 characters, email must be unused |
| `login` | `email, password` (`String!`) | `AuthPayload!` | Log in. Wrong email or password → "Invalid email or password." Session token is valid 7 days |
| `assignUserRole` | `userId: Int!`, `roleId: Int`, `updatedBy: Int` | `User!` | Gives the user **one** role (replacing any previous one), or removes it when `roleId` is `null`. The role must exist and be **active** (checked with the admin service, so **4010 must be running**); an **inactive user** cannot be changed. Recorded in `updated_by` / `updated_dt` against the signed-in user |

```graphql
mutation {
  register(firstName: "Asha", lastName: "Patil", email: "asha@example.com", password: "Passw0rd!") {
    token
    user { id firstName lastName email }
  }
}

mutation {
  login(email: "asha@example.com", password: "Passw0rd!") {
    token
    user { id email }
  }
}
```

```graphql
mutation { assignUserRole(userId: 4, roleId: 3) { id roleId } }

mutation { assignUserRole(userId: 4, roleId: null) { id roleId } }
```

Non-GraphQL routes on 4001: `GET /login` (login page), `GET /admin` (admin dashboard), `POST /admin-api/graphql` (forwards to the admin service), `GET /health`.

---

## Admin service — 4010 (also available on 4000)

### Roles

| Operation | Arguments | Returns | Rules |
|---|---|---|---|
| `rolesList` (Q) | — | `[Role]` | |
| `role` (Q) | `id: Int!` | `Role` | Error "Role not found" if missing |
| `roleHistory` (Q) | `roleId: Int!` | `[RoleHistory!]!` | Every change to the role, newest first (from `mst_roles_tracker`). Still available after the role is deleted |
| `createRole` (M) | `input: CreateRoleInput!` `{ roleName!, roleCode, description, isActive, createdBy }` | `Role` | `roleName` required; name and code must be unique (any case). Max lengths: name 100, code 50, description 100 |
| `updateRole` (M) | `id: Int!`, `input: UpdateRoleInput!` (all fields optional, incl. `updatedBy`) | `Role` | `roleName` cannot be empty; name/code unique; same max lengths |
| `deleteRole` (M) | `id: Int!`, `updatedBy: Int` | `Boolean` | Refused if any user has the role (asks the user service, so **4001 must be running**). A final inactive snapshot is kept in the history |

`createdBy` / `updatedBy` are optional; the signed-in user is recorded automatically (see the notes at the top). `Role` returns `createdBy` and `updatedBy`.

Every create / update / delete writes a snapshot to `mst_roles_tracker` **in the same transaction** as the change.

```graphql
query { rolesList { id roleName roleCode description isActive createdDt createdBy updatedDt updatedBy } }

query { roleHistory(roleId: 5) { trackerId roleName description isActive updatedDt updatedBy } }

mutation { createRole(input: { roleName: "Reviewer", roleCode: "REVIEWER", description: "Reviews bids", createdBy: 1 }) { id roleName } }

mutation { updateRole(id: 5, input: { description: "Reviews and approves bids", isActive: true, updatedBy: 1 }) { id description } }

mutation { deleteRole(id: 5, updatedBy: 1) }
```

### Menus

| Operation | Arguments | Returns | Rules |
|---|---|---|---|
| `menus` (Q) | `asTree: Boolean = false` | `[Menu!]!` | `asTree: true` nests sub-menus under `children` |
| `menu` (Q) | `menuId: Int!` | `Menu` | Returns `null` if not found |
| `createMenu` (M) | `input: CreateMenuInput!` `{ menuName!, menuKey!, icon, parentId, sortOrder!, createdBy! }` | `Menu!` | `menuKey` unique; `sortOrder` ≥ 0; parent must exist and be active |
| `updateMenu` (M) | `menuId: Int!`, `input: UpdateMenuInput!` `{ …optional, updatedBy! }` | `Menu!` | No self-parent, no circular hierarchy, key unique |
| `toggleMenuStatus` (M) | `menuId: Int!`, `isActive: Boolean!`, `updatedBy: Int!` | `Menu!` | Activate / deactivate |

```graphql
query { menus(asTree: true) { menuId menuName menuKey sortOrder isActive children { menuId menuName } } }

query { menu(menuId: 1) { menuId menuName menuKey icon parentId } }

mutation { createMenu(input: { menuName: "Users", menuKey: "users", icon: "users", sortOrder: 1, createdBy: 1 }) { menuId menuName } }

mutation { updateMenu(menuId: 3, input: { menuName: "User Management", updatedBy: 1 }) { menuId menuName } }

mutation { toggleMenuStatus(menuId: 3, isActive: false, updatedBy: 1) { menuId isActive } }
```

### Permissions

| Operation | Arguments | Returns | Rules |
|---|---|---|---|
| `permissions` (Q) | — | `[Permission!]!` | |
| `permission` (Q) | `permissionId: Int!` | `Permission` | |
| `permissionHistory` (Q) | `permissionId: Int!` | `[PermissionHistory!]!` | Every change to the permission, newest first (from `mst_permissions_tracker`) |
| `menusForPermissionMapping` (Q) | — | `[MenuForPermissionMapping!]!` `{ menuId, menuName }` | Menu dropdown for the mapping screen |
| `menuPermissions` (Q) | `menuId: Int!` | `[Permission!]!` | Permissions currently mapped to a menu; "not found" if menu missing |
| `menuPermissionMappings` (Q) | — | `[MenuPermissionMapping!]!` | All menu ↔ permission links |
| `createPermission` (M) | `input` `{ permissionName!, permissionKey!, description, createdBy! }` | `Permission!` | Name/key required |
| `updatePermission` (M) | `permissionId: Int!`, `input` `{ …optional, updatedBy! }` | `Permission!` | |
| `togglePermissionStatus` (M) | `permissionId: Int!`, `isActive: Boolean!`, `updatedBy: Int!` | `Permission!` | |
| `saveMenuPermissions` (M) | `input` `{ menuId!, permissionIds!, updatedBy! }` | `[Permission!]!` | Sets the menu's permissions (table `tbl_menuwise_permission`); at least one permissionId required; the menu and every permission must exist. All-or-nothing (one transaction). Any role grant for a permission the menu no longer allows is revoked |

Create / update / status changes write a snapshot to `mst_permissions_tracker` in the same transaction. Column limits: name 100, key 100, description 500.

```graphql
query { permissions { permissionId permissionName permissionKey isActive } }

query { menuPermissions(menuId: 1) { permissionId permissionName permissionKey } }

mutation { createPermission(input: { permissionName: "View", permissionKey: "view", description: "Can view", createdBy: 1 }) { permissionId } }

mutation { togglePermissionStatus(permissionId: 2, isActive: false, updatedBy: 1) { permissionId isActive } }

mutation { saveMenuPermissions(input: { menuId: 1, permissionIds: [1, 2, 3], updatedBy: 1 }) { permissionId permissionKey } }
```

### Role access (role ↔ menu ↔ permission)

| Operation | Arguments | Returns | Rules |
|---|---|---|---|
| `roleAccess` (Q) | `roleId: Int!` | `[RoleMenuPermission!]!` | Everything a role can do; "Role not found" if missing |
| `roleMenuPermissions` (Q) | `roleId: Int!`, `menuId: Int!` | `[RoleMenuPermission!]!` | One role on one menu |
| `availablePermissionsForMenu` (Q) | `menuId: Int!` | `[AvailablePermission!]!` | Permissions that can be granted on that menu |
| `addRoleMenuPermissions` (M) | `input` `{ roleId!, menuId!, permissionIds!, updatedBy! }` | `[RoleMenuPermission!]!` | Grant. IDs must be positive integers, no duplicates in one request, at least one |
| `removeRoleMenuPermissions` (M) | same input | `[RoleMenuPermission!]!` | Revoke |

```graphql
query { roleAccess(roleId: 1) { menuId menuName permissionKey } }

query { availablePermissionsForMenu(menuId: 1) { permissionId permissionName permissionKey } }

mutation { addRoleMenuPermissions(input: { roleId: 1, menuId: 1, permissionIds: [1, 2], updatedBy: 1 }) { id menuName permissionKey } }

mutation { removeRoleMenuPermissions(input: { roleId: 1, menuId: 1, permissionIds: [2], updatedBy: 1 }) { id permissionKey } }
```

### Placeholder queries (no real data yet)

These only have an `id` field and **always return `[]`** (the repositories are empty stubs).

`roleMenuList` and `rolePermissionsList` were removed: their tables (`tbl_role_menu`, `tbl_role_permissions`) no longer exist. What a role can do on a menu is in the *Role access* section above.

| Query | Returns |
|---|---|
| `phasesList` | `[Phases]` |
| `proposalSectionsList` | `[ProposalSections]` |
| `rateMasterList` | `[RateMaster]` |
| `reasonCodesList` | `[ReasonCodes]` |
| `stagesList` | `[Stages]` |
| `subStagesList` | `[SubStages]` |

```graphql
query { stagesList { id } }
```

---

## Opportunity service — 4003 (not on the gateway by default)

Both are placeholders that return `[]`.

| Query | Returns |
|---|---|
| `opportunityList` | `[Opportunity]` `{ id }` |
| `stageList` | `[Stage]` `{ id }` |

```graphql
query { opportunityList { id } }
```

To reach these through 4000, start the opportunity service, then set `ENABLED_SUBGRAPHS=user,opportunity,admin` in `gateway/.env` and restart the gateway.

---

## Gateway — 4000

Serves the union of the user and admin operations above, with the same names and arguments. You can mix user and admin fields in one request:

```graphql
query {
  rolesList { id roleName }
  menus(asTree: true) { menuId menuName }
  usersByRoleCount(roleId: 1)
}
```

`GET /health` on 4000 returns `{"status":"ok"}`.
