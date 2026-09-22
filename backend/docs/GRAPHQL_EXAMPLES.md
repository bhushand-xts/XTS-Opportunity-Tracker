# GraphQL examples — copy and paste

Every operation, with all input fields filled in and all return fields selected.
Change the values (ids, names, keys) to match your data.

| Endpoint | Has |
|---|---|
| http://localhost:4000/graphql | everything below (gateway) |
| http://localhost:4001/graphql | User service: `register`, `login`, `userList`, `usersByRoleCount` |
| http://localhost:4010/graphql | Admin service: everything else |

Argument rules and behaviour are in `GRAPHQL_API.md`.

**About `createdBy` / `updatedBy`:** they are optional. If you are signed in, your login user id is recorded automatically — to sign in from Apollo Sandbox, run `login`, copy the `token`, and add the header `Authorization: Bearer <token>`. Without a token, pass `createdBy` / `updatedBy` yourself (the examples below do), or the change is refused with "You must be signed in to make changes."


---

# MUTATIONS

## User service (4001 / 4000)

### register
```graphql
mutation {
  register(
    firstName: "Asha"
    lastName: "Patil"
    email: "asha@asha.com"
    password: "Password@1234"
  ) {
    token
    user {
      id
      firstName
      lastName
      email
    }
  }
}
```

### assignUserRole
Gives a user one role (replacing any previous one). Use `roleId: null` to remove the role. Needs the `Authorization` header (or pass `updatedBy`). The role must be active.
```graphql
mutation {
  assignUserRole(
    userId: 4
    roleId: 3
  ) {
    id
    firstName
    lastName
    email
    roleId
    isActive
  }
}
```

### login
```graphql
mutation {
  login(
    email: "asha@example.com"
    password: "Passw0rd!"
  ) {
    token
    user {
      id
      firstName
      lastName
      email
    }
  }
}
```

## Admin service (4010 / 4000)

### createRole
```graphql
mutation {
  createRole(input: {
    roleName: "Admin"
    roleCode: "ADMIN"
    description: "Full system access"
    isActive: true
    createdBy: 1
  }) {
    id
    roleName
    roleCode
    description
    isActive
    createdDt
    createdBy
    updatedDt
    updatedBy
  }
}
```

### updateRole
```graphql
mutation {
  updateRole(
    id: 1
    input: {
      roleName: "Administrator"
      roleCode: "ADMIN"
      description: "Full system access and user management"
      isActive: true
      updatedBy: 1
    }
  ) {
    id
    roleName
    roleCode
    description
    isActive
    createdDt
    createdBy
    updatedDt
    updatedBy
  }
}
```

### deleteRole
Returns `true`. Fails if any user has this role (the user service on 4001 must be running). The role's history is kept.
```graphql
mutation {
  deleteRole(id: 1, updatedBy: 1)
}
```

### createMenu
```graphql
mutation {
  createMenu(input: {
    menuName: "User Management"
    menuKey: "user-management"
    icon: "users"
    parentId: null
    sortOrder: 1
    createdBy: 1
  }) {
    menuId
    menuName
    menuKey
    icon
    parentId
    sortOrder
    isActive
    createdDt
    createdBy
    updatedDt
    updatedBy
  }
}
```

### updateMenu
```graphql
mutation {
  updateMenu(
    menuId: 1
    input: {
      menuName: "Users"
      menuKey: "users"
      icon: "user"
      parentId: null
      sortOrder: 2
      updatedBy: 1
    }
  ) {
    menuId
    menuName
    menuKey
    icon
    parentId
    sortOrder
    isActive
    createdDt
    createdBy
    updatedDt
    updatedBy
  }
}
```

### toggleMenuStatus
```graphql
mutation {
  toggleMenuStatus(
    menuId: 1
    isActive: false
    updatedBy: 1
  ) {
    menuId
    menuName
    menuKey
    isActive
    updatedDt
    updatedBy
  }
}
```

### createPermission
```graphql
mutation {
  createPermission(input: {
    permissionName: "View"
    permissionKey: "view"
    description: "Can view records"
    createdBy: 1
  }) {
    permissionId
    permissionName
    permissionKey
    description
    isActive
    createdDt
    createdBy
    updatedDt
    updatedBy
  }
}
```

### updatePermission
```graphql
mutation {
  updatePermission(
    permissionId: 1
    input: {
      permissionName: "View Records"
      permissionKey: "view"
      description: "Can view all records"
      updatedBy: 1
    }
  ) {
    permissionId
    permissionName
    permissionKey
    description
    isActive
    createdDt
    createdBy
    updatedDt
    updatedBy
  }
}
```

### togglePermissionStatus
```graphql
mutation {
  togglePermissionStatus(
    permissionId: 1
    isActive: false
    updatedBy: 1
  ) {
    permissionId
    permissionName
    permissionKey
    isActive
    updatedDt
    updatedBy
  }
}
```

### saveMenuPermissions
Sets the permissions for a menu. The menu and every permission id must exist.
```graphql
mutation {
  saveMenuPermissions(input: {
    menuId: 1
    permissionIds: [1, 2, 3]
    updatedBy: 1
  }) {
    permissionId
    permissionName
    permissionKey
    description
    isActive
    createdDt
    createdBy
    updatedDt
    updatedBy
  }
}
```

### addRoleMenuPermissions
Grants permissions to a role on a menu. No duplicate ids in one request.
```graphql
mutation {
  addRoleMenuPermissions(input: {
    roleId: 1
    menuId: 1
    permissionIds: [1, 2]
    updatedBy: 1
  }) {
    id
    roleId
    menuId
    permissionId
    menuName
    permissionName
    permissionKey
    createdDt
    createdBy
    updatedDt
    updatedBy
  }
}
```

### removeRoleMenuPermissions
```graphql
mutation {
  removeRoleMenuPermissions(input: {
    roleId: 1
    menuId: 1
    permissionIds: [2]
    updatedBy: 1
  }) {
    id
    roleId
    menuId
    permissionId
    menuName
    permissionName
    permissionKey
    createdDt
    createdBy
    updatedDt
    updatedBy
  }
}
```

---

# QUERIES

## User service (4001 / 4000)

### userList
Every user, with the role they hold (`roleId`, or `null`).
```graphql
query {
  userList {
    id
    firstName
    lastName
    email
    roleId
    isActive
  }
}
```

### currentUserId
Needs the `Authorization: Bearer <token>` header. Returns your user id, or `null` if not signed in.
```graphql
query {
  currentUserId
}
```

### usersByRoleCount
```graphql
query {
  usersByRoleCount(roleId: 1)
}
```

## Admin service (4010 / 4000)

### rolesList
```graphql
query {
  rolesList {
    id
    roleName
    roleCode
    description
    isActive
    createdDt
    createdBy
    updatedDt
    updatedBy
  }
}
```

### roleHistory
Every change to a role, newest first. Still works after the role is deleted.
```graphql
query {
  roleHistory(roleId: 1) {
    trackerId
    roleId
    roleName
    roleCode
    description
    isActive
    createdDt
    createdBy
    updatedDt
    updatedBy
  }
}
```

### role
```graphql
query {
  role(id: 1) {
    id
    roleName
    roleCode
    description
    isActive
    createdDt
    createdBy
    updatedDt
    updatedBy
  }
}
```

### menus (flat list)
Do not select `children` here — it is only filled in the tree version.
```graphql
query {
  menus {
    menuId
    menuName
    menuKey
    icon
    parentId
    sortOrder
    isActive
    createdDt
    createdBy
    updatedDt
    updatedBy
  }
}
```

### menus (as a tree)
```graphql
query {
  menus(asTree: true) {
    menuId
    menuName
    menuKey
    icon
    parentId
    sortOrder
    isActive
    createdDt
    createdBy
    updatedDt
    updatedBy
    children {
      menuId
      menuName
      menuKey
      icon
      parentId
      sortOrder
      isActive
    }
  }
}
```

### menu
Returns `null` if the id does not exist.
```graphql
query {
  menu(menuId: 1) {
    menuId
    menuName
    menuKey
    icon
    parentId
    sortOrder
    isActive
    createdDt
    createdBy
    updatedDt
    updatedBy
    children {
      menuId
      menuName
      menuKey
    }
  }
}
```

### permissions
```graphql
query {
  permissions {
    permissionId
    permissionName
    permissionKey
    description
    isActive
    createdDt
    createdBy
    updatedDt
    updatedBy
  }
}
```

### permission
```graphql
query {
  permission(permissionId: 1) {
    permissionId
    permissionName
    permissionKey
    description
    isActive
    createdDt
    createdBy
    updatedDt
    updatedBy
  }
}
```

### permissionHistory
Every change to a permission, newest first.
```graphql
query {
  permissionHistory(permissionId: 1) {
    trackerId
    permissionId
    permissionName
    permissionKey
    description
    isActive
    createdDt
    createdBy
    updatedDt
    updatedBy
  }
}
```

### menusForPermissionMapping
```graphql
query {
  menusForPermissionMapping {
    menuId
    menuName
  }
}
```

### menuPermissions
```graphql
query {
  menuPermissions(menuId: 1) {
    permissionId
    permissionName
    permissionKey
    description
    isActive
    createdDt
    createdBy
    updatedDt
    updatedBy
  }
}
```

### menuPermissionMappings
```graphql
query {
  menuPermissionMappings {
    id
    menuId
    permissionId
    menuName
    permissionName
    permissionKey
    createdDt
    createdBy
    updatedDt
    updatedBy
  }
}
```

### roleAccess
```graphql
query {
  roleAccess(roleId: 1) {
    id
    roleId
    menuId
    permissionId
    menuName
    permissionName
    permissionKey
    createdDt
    createdBy
    updatedDt
    updatedBy
  }
}
```

### roleMenuPermissions
```graphql
query {
  roleMenuPermissions(roleId: 1, menuId: 1) {
    id
    roleId
    menuId
    permissionId
    menuName
    permissionName
    permissionKey
    createdDt
    createdBy
    updatedDt
    updatedBy
  }
}
```

### availablePermissionsForMenu
```graphql
query {
  availablePermissionsForMenu(menuId: 1) {
    permissionId
    permissionName
    permissionKey
  }
}
```

### Placeholder queries (always return `[]`, only `id` exists)

```graphql
query {
  phasesList {
    id
  }
}
```
```graphql
query {
  proposalSectionsList {
    id
  }
}
```
```graphql
query {
  rateMasterList {
    id
  }
}
```
```graphql
query {
  reasonCodesList {
    id
  }
}
```
```graphql
query {
  stagesList {
    id
  }
}
```
```graphql
query {
  subStagesList {
    id
  }
}
```

## Opportunity service (4003 only — not on the gateway by default)

```graphql
query {
  opportunityList {
    id
  }
}
```
```graphql
query {
  stageList {
    id
  }
}
```
