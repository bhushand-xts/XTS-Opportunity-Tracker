# XTS Opportunity Tracker — Backend

Node.js + GraphQL + PostgreSQL. No Docker.

## Structure

    gateway/     GraphQL gateway — single client-facing endpoint
    services/    Business domain microservices
    shared/      Technical utilities (auth, errors, utils, constants)
    database/    schema.sql, migrations, seeds
    docs/        Project notes (daily log, architecture notes, setup commands)
    scaffold.js  Generator for this folder structure (safe to re-run)

Database-per-service migration in progress. Services with real tables today
have their own database; the rest still share `xts` until they get schemas
of their own. Per-service DDL lives under `database/services/<service>/schema.sql`.

Implemented today (code in `services/`):

    user            xts_user
    opportunity     xts_opportunity
    admin           xts_admin

Planned (no code in `services/` yet):

    account         xts_account         (schema.sql exists)
    estimation      xts_estimation      (no schema.sql yet)
    approval        xts (shared, no tables yet)
    rfp             xts (shared, no tables yet)
    document        xts (shared, no tables yet)
    notification    xts (shared, no tables yet)
    reporting-audit xts (shared, no tables yet)

Foreign keys that used to cross service boundaries (e.g. `tbl_opportunity
.client_id` -> account's `mst_client`) were dropped when split — Postgres
can't enforce a FK across two databases. The column stays as a plain
INTEGER; referential integrity for those is the application's job now.

## Ports

    gateway            4000
    user               4001
    account            4002   (planned)
    opportunity        4003
    estimation         4004   (planned)
    approval           4005   (planned)
    rfp                4006   (planned)
    document           4007   (planned)
    notification       4008   (planned)
    reporting-audit    4009   (planned)
    admin              4010

## Setup

Dependencies are installed once, in `backend/`, through npm workspaces
(see `workspaces` in `backend/package.json`). Dependencies are hoisted into a
single `backend/node_modules` shared by the gateway and every service, and
nothing is installed at the repo root.

    npm run install:all          # from backend/ — same as `npm install`

Each service and the gateway has its own `.env.example`. Copy it to `.env`
in the same folder and fill in the DB credentials. `.env` is git-ignored —
never commit it.

    services/user/.env.example
    services/opportunity/.env.example
    services/admin/.env.example
    gateway/.env.example

Run each service's own DDL once, against its own database:

    createdb xts_user       && psql -d xts_user       -f database/services/user/schema.sql
    createdb xts_opportunity && psql -d xts_opportunity -f database/services/opportunity/schema.sql
    createdb xts_admin      && psql -d xts_admin      -f database/services/admin/schema.sql

Check a DB connection for the admin service (reads `services/admin/.env`):

    cd services/admin && node test-db.js

Start everything at once with hot reload:

    npm run dev                  # from backend/

Or start each service in its own terminal:

    cd services/user && npm run dev

Start the gateway last — it introspects the services on boot. By default it
composes only `user` and `admin` (`ENABLED_SUBGRAPHS` in `gateway/.env`);
every service listed there must be running or the gateway will not start.

**Who is signed in:** the frontend sends the login token with every request
(`Authorization: Bearer ...`). The gateway checks it with the user service
(`currentUserId`) and passes the user's id to the other services in an
`x-user-id` header. Services record that id as `created_by` / `updated_by`, so
the audit trail always shows the real login user, whatever the caller typed.
No token, or an invalid one, simply means "not signed in".

The gateway only accepts browser requests from the origins in `CORS_ORIGIN`
(comma-separated). It defaults to the frontend's `http://localhost:3000` and
`http://localhost:3001`. Restart the gateway after changing it.

## Build output

`npm run build` compiles TypeScript into each project's `dist/` folder.
`dist/` is generated, so it is git-ignored — do not commit it. `npm start`
runs the compiled output.

## Request flow

    React -> Gateway -> Domain service -> Resolver -> Service -> Validator -> Repository -> PostgreSQL

## Rules

1. Resolvers hold no business logic — that goes in services/
2. All SQL lives in repositories/
3. Always use $1 parameters, never string concatenation
4. No process.env outside config/env.js
5. Record + _tracker writes happen in one transaction
6. created_by / updated_by always set — our only audit trail
7. Never edit a merged migration; write a new one
8. notification and reporting-audit listen only — never call back into a domain service
9. CRUD belongs inside its domain service, not in a new service
