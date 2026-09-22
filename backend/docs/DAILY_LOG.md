# Daily Work Log

Running record of what was done on this project, by day. Newest entry on top.

---

## 2026-09-09

**Explored & documented the existing structure**
- Walked through the backend folder structure: 10 microservices (`user`, `account`, `opportunity`, `estimation`, `approval`, `rfp`, `document`, `notification`, `reporting-audit`, `admin`) + `gateway` + `shared` + `database`.
- Explained the layered pattern each service follows (`graphql/typeDefs` → `graphql/resolvers` → `services` → `validators` → `repositories`), the gateway's Apollo Federation role, and `env.ts`/`db.ts` config responsibilities.

**Normalized `admin`'s structure**
- `admin` was feature-first (`menus/`, `roles/`, etc., 3 files each) while every other service was layer-first. Restructured it into the same `graphql/typeDefs/`, `graphql/resolvers/`, `services/`, `repositories/` layout as the rest (11 entities: menus, permissions, phases, proposal-sections, rate-master, reason-codes, role-menu, role-permissions, roles, stages, sub-stages).
- Wired up `document`, `notification`, `reporting-audit` (previously had services but no typeDefs/resolvers/repositories connecting them).

**Converted the entire backend to TypeScript**
- Piloted `account` first (own `tsconfig.json`, typed `env`/`db`, `.ts` everywhere), verified it boots and serves GraphQL correctly.
- Extended to all remaining 9 services + `gateway` — typed configs, repositories, resolvers; `tsx watch` for dev, `tsc` for build.
- Updated `scaffold.js` (the repo's from-scratch generator) to match, so a fresh clone reproduces this exact TypeScript structure.

**Fixed Apollo Federation (gateway couldn't compose services)**
- Discovered the gateway failed to start (`400: Bad Request` from `IntrospectAndCompose`) because services used plain `ApolloServer({ typeDefs, resolvers })` instead of a federation subgraph schema.
- Added `buildSubgraphSchema()` from `@apollo/subgraph` to all 10 services' `index.ts`. Verified the gateway now composes all 10 and a combined query (`userList` + `accountList` + `opportunityList` + `menusList`) routes correctly.

**Database-per-service split**
- Replaced the placeholder `database/schema.sql` with a real 24-table DDL (provided by the user).
- Mapped all 24 tables to their owning service and split into `database/services/<name>/schema.sql` for `user`, `account`, `opportunity`, `estimation`, `admin` — each gets its own database (`xts_user`, `xts_account`, `xts_opportunity`, `xts_estimation`, `xts_admin`). Cross-service foreign keys (e.g. every table's `created_by` → `mst_user`) were dropped since Postgres can't enforce FKs across databases — columns stay as plain integers, referential integrity moves to the application layer.
- `approval`, `rfp`, `document`, `notification`, `reporting-audit` still share the `xts` database (no tables yet).
- Updated `scaffold.js` and `README.md` to match.

**Started Jira ticket: Admin Panel — User Management / Role Master**
- Decided to build backend first (real Role CRUD API), frontend later — no `frontend/` exists yet.
- Added `role_code` column + case-insensitive unique indexes on `role_name`/`role_code` to `mst_roles` (`database/services/admin/schema.sql`).
- Implemented real `admin` service roles CRUD: `repositories/roles.repository.ts` (real SQL), `validators/roles.validator.ts` (required name), `services/roles.service.ts` (duplicate-name/code checks, delete-in-use check), expanded `graphql/typeDefs/roles.typeDefs.ts` + `resolvers/roles.resolver.ts` with `role`, `createRole`, `updateRole`, `deleteRole`.
- Cross-service problem: "is this role assigned to a user" can't be a SQL join anymore (roles and users are in separate databases) — added `services/admin/src/integrations/userService.ts`, which calls a new `usersByRoleCount(roleId)` GraphQL query added to the `user` service, over HTTP.
- Verified via `tsc --noEmit` (clean) and live boot: all new queries/mutations route correctly through resolver → service → repository (confirmed via error stack traces reaching the right files); blocked only by Postgres auth, since no real DB is provisioned/migrated yet.

**Still open / next steps**
- Provision real Postgres databases (`xts_user`, `xts_account`, `xts_opportunity`, `xts_estimation`, `xts_admin`, `xts`) and run each service's `schema.sql` to actually test CRUD end-to-end.
- Build the frontend (`Vite + React + Apollo Client`, per `requirements.txt`) — sidebar nav with **User Management → Role Master**, Add/Edit/Delete forms, and the Role Master grid.
- Gateway's `auth.middleware.ts` is still a stub (`req.user = null` always) — real auth needed before `created_by`/`updated_by` audit columns are meaningfully populated.
