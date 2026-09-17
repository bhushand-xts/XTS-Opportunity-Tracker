# XTS Opportunity Tracker — Backend

Node.js + GraphQL + PostgreSQL. No Docker.

## Structure

    gateway/     GraphQL gateway — single client-facing endpoint
    services/    Business domain microservices
    shared/      Technical utilities (auth, errors, utils, constants)
    database/    schema.sql, migrations, seeds

Database-per-service migration in progress. Services with real tables today
have their own database; the rest still share `xts` until they get schemas
of their own. Per-service DDL lives under `database/services/<service>/schema.sql`.

    user            xts_user
    account         xts_account
    opportunity     xts_opportunity
    estimation      xts_estimation
    admin           xts_admin
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
    account            4002
    opportunity        4003
    estimation         4004
    approval           4005
    rfp                4006
    document           4007
    notification       4008
    reporting-audit    4009
    admin              4010

## Setup

Each service is its own npm project.

    npm run install:all

Each of `gateway/`, `services/user/`, `services/admin/`, `services/opportunity/`
has its own `.env.example` in that same folder — copy it to `.env` in that
exact folder (not the repo root, not `backend/`) and fill in `DB_PASSWORD`.
Each service's `.env` is read from wherever `npm run dev` is invoked FROM.

On the team's shared dev Postgres server, user/auth tables (`mst_user`,
`auth_session`) live inside the SAME database as admin's — there is no
separate user database, confirmed via Adminer against the live server.
Opportunity's database is named `opportunity_tracker`, not `opportunity_db`.
(See each `.env.example` for the exact current names — this is what's
actually provisioned today, not necessarily what schema.sql's own comments
describe as the intended eventual database-per-service split.)

    createdb admin_db          && psql -d admin_db          -f database/services/user/schema.sql
    psql -d admin_db -f database/services/admin/schema.sql
    createdb opportunity_tracker && psql -d opportunity_tracker -f database/services/opportunity/schema.sql

(`account` and `estimation` have schema files too, but no service implements
them yet — see gateway/src/config/services.ts, only user/admin/opportunity
are wired into the gateway's composition currently.)

Start each service in its own terminal:

    cd services/user && npm run dev

Start the gateway last — it introspects the services on boot.

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
