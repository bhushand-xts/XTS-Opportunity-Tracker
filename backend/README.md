# XTS Opportunity Tracker — Backend

Node.js + GraphQL + PostgreSQL. No Docker.

## Structure

    gateway/     GraphQL gateway — single client-facing endpoint
    services/    Business domain microservices
    shared/      Technical utilities (auth, errors, utils, constants)
    database/    schema.sql, migrations, seeds

Database-per-service migration in progress: each service is moving to its own
PostgreSQL database (e.g. `xts_account`) instead of the one shared `xts` DB.
Per-service DDL lives under `database/services/<service>/schema.sql`.
Piloted so far: **account** (TypeScript + `xts_account`).

## Ports

    gateway            4000
    user               4001
    account            4002
    opportunity        4003
    estimation         4004
    approval            4005
    rfp                4006
    document           4007
    notification       4008
    reporting-audit    4009
    admin              4010

## Setup

Each service is its own npm project.

    npm run install:all

Then copy .env.example into each service folder as .env and set the port.

Run the database DDL once:

    psql -f database/schema.sql

Start each service in its own terminal:

    cd services/user && npm run dev

`account` is TypeScript — build once (or run its dev script, which uses
`tsx watch`) before `npm start`:

    cd services/account && npm run dev

Start the gateway last — it introspects the services on boot.

## Request flow

    React -> Gateway -> Domain service -> Resolver -> Service -> Validator -> Repository -> PostgreSQL

## Rules

1. Resolvers hold no business logic — that goes in services/
2. All SQL lives in repositories/
3. Always use $1 parameters, never string concatenation
4. No process.env outside config/env.js (or config/env.ts for account)
5. Record + _tracker writes happen in one transaction
6. created_by / updated_by always set — our only audit trail
7. Never edit a merged migration; write a new one
8. notification and reporting-audit listen only — never call back into a domain service
9. CRUD belongs inside its domain service, not in a new service
