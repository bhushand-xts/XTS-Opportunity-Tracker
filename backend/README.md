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

Then copy .env.example into each service folder as .env and set the port.

Run each service's own DDL once, against its own database:

    createdb xts_user       && psql -d xts_user       -f database/services/user/schema.sql
    createdb xts_account    && psql -d xts_account    -f database/services/account/schema.sql
    createdb xts_opportunity && psql -d xts_opportunity -f database/services/opportunity/schema.sql
    createdb xts_estimation && psql -d xts_estimation -f database/services/estimation/schema.sql
    createdb xts_admin      && psql -d xts_admin      -f database/services/admin/schema.sql
    createdb xts            # shared DB for the remaining services (no schema yet)

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
