/**
 * scaffold.js — XTS Opportunity Tracker backend.
 *
 * Follows the folder structure in
 * "XTS Opportunity Tracker — Backend Microservices Folder Structure"
 * exactly, plus the admin service (now normalized to the same
 * typeDefs/resolvers/services/repositories layout as every other service).
 *
 * `account` is generated as a TypeScript project with its own database
 * (xts_account) — the pilot for the database-per-service migration.
 * Every other service is still plain JS on the shared `xts` database.
 *
 * Run from the repo root:   node scaffold.js
 *
 * Safe to re-run. Never overwrites an existing file.
 *
 * NOTE: each service is its own npm project with its own package.json
 * and .env. You must run `npm install` inside each one.
 */

const fs = require('fs');
const path = require('path');

const ROOT = 'backend';

// ---------------------------------------------------------------
// ADMIN ENTITIES — one typeDefs/resolver/service/repository set
// per master-data/access-control entity, same shape as every
// other service.
// ---------------------------------------------------------------
const ADMIN_ENTITIES = [
  'menus',
  'permissions',
  'phases',
  'proposal-sections',
  'rate-master',
  'reason-codes',
  'role-menu',
  'role-permissions',
  'roles',
  'stages',
  'sub-stages',
];

// ---------------------------------------------------------------
// SERVICE DEFINITIONS  (from the docx)
//
//   typeDefs / resolvers / services / repositories / validators
//   are the file base names inside each folder.
//   An empty array still creates the folder (with .gitkeep).
//
//   typescript: true  -> service is generated as a TS project
//   ownDb: true        -> service gets its own DB_NAME (xts_<name>)
//                          instead of the shared `xts` database
// ---------------------------------------------------------------
const SERVICES = {
  user: {
    comment: 'User, authentication & SSO',
    config: ['db', 'env'],
    typeDefs: ['user'],
    resolvers: ['user'],
    services: ['user', 'auth', 'sso'],
    repositories: ['user'],
    validators: ['user'],
    typescript: true,
  },

  account: {
    comment: 'Account, Contact & Master Data',
    config: ['db', 'env'],
    typeDefs: ['account', 'contact', 'industry', 'currency'],
    resolvers: ['account', 'contact', 'industry', 'currency'],
    services: ['account', 'contact', 'industry', 'currency'],
    repositories: ['account', 'contact'],
    validators: ['account'],
    typescript: true,
    ownDb: true,
  },

  opportunity: {
    comment: 'Opportunity & Pipeline',
    config: ['db', 'env'],
    typeDefs: ['opportunity', 'stage'],
    resolvers: ['opportunity', 'stage'],
    services: ['opportunity', 'stage'],
    repositories: ['opportunity', 'stage'],
    validators: ['opportunity'],
    typescript: true,
  },

  estimation: {
    comment: 'Estimation & Rate Master',
    config: [],
    typeDefs: ['estimate', 'rateCard'],
    resolvers: ['estimate', 'rateCard'],
    services: ['estimate', 'rateCard'],
    repositories: ['estimate', 'rateCard'],
    validators: ['estimate'],
    typescript: true,
  },

  approval: {
    comment: 'Approvals & Gates',
    config: [],
    typeDefs: ['approval', 'gate'],
    resolvers: ['approval', 'gate'],
    services: ['approval', 'gate'],
    repositories: ['approval', 'gate'],
    validators: ['approval'],
    typescript: true,
  },

  rfp: {
    comment: 'RFP Intake & Response',
    config: [],
    typeDefs: ['rfp', 'questionnaire', 'response'],
    resolvers: ['rfp', 'questionnaire', 'response'],
    services: ['rfp', 'questionnaire', 'response'],
    repositories: [],
    validators: [],
    typescript: true,
  },

  document: {
    comment: 'Documents & Attachments',
    config: [],
    typeDefs: ['document', 'attachment', 'version'],
    resolvers: ['document', 'attachment', 'version'],
    services: ['document', 'attachment', 'version'],
    repositories: ['document', 'attachment', 'version'],
    validators: [],
    storage: true,
    typescript: true,
  },

  notification: {
    comment: 'Notifications',
    config: [],
    typeDefs: ['notification', 'email', 'template'],
    resolvers: ['notification', 'email', 'template'],
    services: ['notification', 'email', 'template'],
    repositories: ['notification', 'email', 'template'],
    events: true,
    typescript: true,
  },

  'reporting-audit': {
    comment: 'Reporting & Immutable Audit',
    config: [],
    typeDefs: ['audit', 'reporting'],
    resolvers: ['audit', 'reporting'],
    services: ['audit', 'reporting'],
    repositories: ['audit', 'reporting'],
    events: true,
    typescript: true,
  },

  admin: {
    comment: 'Administration — master data and access control',
    config: ['db', 'env'],
    typeDefs: ADMIN_ENTITIES,
    resolvers: ADMIN_ENTITIES,
    services: ADMIN_ENTITIES,
    repositories: ADMIN_ENTITIES,
    validators: [],
    typescript: true,
  },
};

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------
let created = 0;
let skipped = 0;

function file(p, content = '') {
  const full = path.join(ROOT, p);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  if (fs.existsSync(full)) {
    skipped++;
    return;
  }
  fs.writeFileSync(full, content);
  created++;
}

// creates the folder; adds .gitkeep so git tracks it when empty
function emptyDir(p) {
  fs.mkdirSync(path.join(ROOT, p), { recursive: true });
  file(path.join(p, '.gitkeep'), '');
}

const camel = (s) => s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
const pascal = (s) => {
  const c = camel(s);
  return c.charAt(0).toUpperCase() + c.slice(1);
};

console.log('\nScaffolding ' + ROOT + '/ ...\n');

// ---------------------------------------------------------------
// Shared file templates — plain JS services
// ---------------------------------------------------------------
const envJs = (port) => `// Reads env vars ONCE. Never call process.env anywhere else.

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error('Missing env var: ' + name);
  return value;
}

module.exports = {
  port: process.env.PORT || ${port},
  db: {
    host: required('DB_HOST'),
    port: process.env.DB_PORT || 5432,
    database: required('DB_NAME'),
    user: required('DB_USER'),
    password: required('DB_PASSWORD'),
    max: Number(process.env.DB_POOL_MAX || 10),
  },
};
`;

const dbJs = `const { Pool } = require('pg');
const env = require('./env');

// ONE pool per service. Never create another one.
const pool = new Pool(env.db);

pool.on('error', (err) => console.error('pg pool error', err));

// Always pass values as parameters. Never build SQL with string concat.
async function query(text, params) {
  const result = await pool.query(text, params);
  return result.rows;
}

// Use for any write that also touches a _tracker table.
async function transaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { pool, query, transaction };
`;

const pkgJson = (name, port) =>
  JSON.stringify(
    {
      name: `xts-${name}`,
      version: '1.0.0',
      private: true,
      main: 'src/index.js',
      scripts: {
        dev: 'nodemon src/index.js',
        start: 'node src/index.js',
      },
      dependencies: {
        '@apollo/server': '4.11.3',
        '@apollo/subgraph': '2.9.3',
        cors: '2.8.5',
        dotenv: '16.4.7',
        express: '4.21.2',
        graphql: '16.10.0',
        pg: '8.13.1',
      },
      devDependencies: { nodemon: '3.1.9' },
    },
    null,
    2
  ) + '\n';

const envFile = (port, dbName = 'xts') => `PORT=${port}

DB_HOST=localhost
DB_PORT=5432
DB_NAME=${dbName}
DB_USER=postgres
DB_PASSWORD=
DB_POOL_MAX=10
`;

// ---------------------------------------------------------------
// Shared file templates — TypeScript services (account pilot)
// ---------------------------------------------------------------
const envTs = (port) => `// Reads env vars ONCE. Never call process.env anywhere else.

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error('Missing env var: ' + name);
  return value;
}

export interface DbConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  max: number;
}

export interface Env {
  port: number;
  db: DbConfig;
}

const env: Env = {
  port: Number(process.env.PORT || ${port}),
  db: {
    host: required('DB_HOST'),
    port: Number(process.env.DB_PORT || 5432),
    database: required('DB_NAME'),
    user: required('DB_USER'),
    password: required('DB_PASSWORD'),
    max: Number(process.env.DB_POOL_MAX || 10),
  },
};

export default env;
`;

const dbTs = `import { Pool, PoolClient } from 'pg';
import env from './env';

// ONE pool per service. Never create another one.
const pool = new Pool(env.db);

pool.on('error', (err) => console.error('pg pool error', err));

// Always pass values as parameters. Never build SQL with string concat.
async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
  const result = await pool.query(text, params);
  return result.rows;
}

// Use for any write that also touches a _tracker table.
async function transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export { pool, query, transaction };
`;

const pkgJsonTs = (name, port) =>
  JSON.stringify(
    {
      name: `xts-${name}`,
      version: '1.0.0',
      private: true,
      main: 'dist/index.js',
      scripts: {
        dev: 'tsx watch src/index.ts',
        build: 'tsc',
        start: 'node dist/index.js',
      },
      dependencies: {
        '@apollo/server': '4.11.3',
        '@apollo/subgraph': '2.9.3',
        cors: '2.8.5',
        dotenv: '16.4.7',
        express: '4.21.2',
        graphql: '16.10.0',
        pg: '8.13.1',
      },
      devDependencies: {
        '@types/cors': '2.8.17',
        '@types/express': '4.17.21',
        '@types/node': '22.10.5',
        '@types/pg': '8.11.10',
        tsx: '4.19.2',
        typescript: '5.7.2',
      },
    },
    null,
    2
  ) + '\n';

const tsconfigJson = JSON.stringify(
  {
    compilerOptions: {
      target: 'ES2020',
      module: 'CommonJS',
      moduleResolution: 'node',
      lib: ['ES2020'],
      outDir: 'dist',
      rootDir: '../..',
      strict: true,
      esModuleInterop: true,
      allowJs: true,
      resolveJsonModule: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
      declaration: false,
      sourceMap: true,
    },
    include: ['src/**/*.ts'],
  },
  null,
  2
) + '\n';

// gateway has no cross-boundary import into shared/, so its rootDir stays
// scoped to its own src/ instead of reaching up to backend/ like the
// per-service tsconfig does.
const tsconfigJsonGateway = JSON.stringify(
  {
    compilerOptions: {
      target: 'ES2020',
      module: 'CommonJS',
      moduleResolution: 'node',
      lib: ['ES2020'],
      outDir: 'dist',
      rootDir: 'src',
      strict: true,
      esModuleInterop: true,
      resolveJsonModule: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
      declaration: false,
      sourceMap: true,
    },
    include: ['src/**/*.ts'],
  },
  null,
  2
) + '\n';

// ---------------------------------------------------------------
// 1. gateway/  (TypeScript)
// ---------------------------------------------------------------
file('gateway/src/config/env.ts', `function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error('Missing env var: ' + name);
  return value;
}

export interface Env {
  port: number;
  corsOrigin: string;
}

const env: Env = {
  port: Number(process.env.PORT || 4000),
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
};

export default env;
`);

file('gateway/src/config/services.ts', `// Where each domain service lives. The gateway composes these.

export interface ServiceEntry {
  name: string;
  url: string;
}

const services: ServiceEntry[] = [
  { name: 'user',            url: process.env.USER_URL            || 'http://localhost:4001/graphql' },
  { name: 'account',         url: process.env.ACCOUNT_URL         || 'http://localhost:4002/graphql' },
  { name: 'opportunity',     url: process.env.OPPORTUNITY_URL     || 'http://localhost:4003/graphql' },
  { name: 'estimation',      url: process.env.ESTIMATION_URL      || 'http://localhost:4004/graphql' },
  { name: 'approval',        url: process.env.APPROVAL_URL        || 'http://localhost:4005/graphql' },
  { name: 'rfp',             url: process.env.RFP_URL             || 'http://localhost:4006/graphql' },
  { name: 'document',        url: process.env.DOCUMENT_URL        || 'http://localhost:4007/graphql' },
  { name: 'notification',    url: process.env.NOTIFICATION_URL    || 'http://localhost:4008/graphql' },
  { name: 'reporting-audit', url: process.env.REPORTING_AUDIT_URL || 'http://localhost:4009/graphql' },
  { name: 'admin',           url: process.env.ADMIN_URL           || 'http://localhost:4010/graphql' },
];

export default services;
`);

file('gateway/src/middleware/auth.middleware.ts', `import { Request, Response, NextFunction } from 'express';

// Validates the token and puts the user on the request.
// Placeholder: msttbl_user has no email or external id column yet.

export default function auth(req: Request, res: Response, next: NextFunction): void {
  (req as any).user = null;
  next();
}
`);

file('gateway/src/graphql/gateway.ts', `import { ApolloGateway, IntrospectAndCompose } from '@apollo/gateway';
import serviceList from '../config/services';

// Composes every domain service into one schema.
// NOTE: needs @apollo/gateway installed, and each service must expose
// a subgraph (@apollo/subgraph).

const gateway = new ApolloGateway({
  supergraphSdl: new IntrospectAndCompose({ subgraphs: serviceList }),
});

export default gateway;
`);

file('gateway/src/index.ts', `import 'dotenv/config';

import express from 'express';
import cors from 'cors';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';

import env from './config/env';
import gateway from './graphql/gateway';
import auth from './middleware/auth.middleware';

async function start() {
  const app = express();
  app.use(cors({ origin: env.corsOrigin }));
  app.use(express.json());
  app.use(auth);

  const server = new ApolloServer({ gateway });
  await server.start();

  app.use('/graphql', expressMiddleware(server, {
    context: async ({ req }: { req: any }) => ({ user: req.user }),
  }));

  app.get('/health', (req, res) => res.json({ status: 'ok' }));

  app.listen(env.port, () =>
    console.log('Gateway ready on http://localhost:' + env.port + '/graphql')
  );
}

start().catch((err) => {
  console.error('Gateway failed to start:', err);
  process.exit(1);
});
`);

file('gateway/tsconfig.json', tsconfigJsonGateway);

file(
  'gateway/package.json',
  JSON.stringify(
    {
      name: 'xts-gateway',
      version: '1.0.0',
      private: true,
      main: 'dist/index.js',
      scripts: {
        dev: 'tsx watch src/index.ts',
        build: 'tsc',
        start: 'node dist/index.js',
      },
      dependencies: {
        '@apollo/gateway': '2.9.3',
        '@apollo/server': '4.11.3',
        cors: '2.8.5',
        dotenv: '16.4.7',
        express: '4.21.2',
        graphql: '16.10.0',
      },
      devDependencies: {
        '@types/cors': '2.8.17',
        '@types/express': '4.17.21',
        '@types/node': '22.10.5',
        tsx: '4.19.2',
        typescript: '5.7.2',
      },
    },
    null,
    2
  ) + '\n'
);

file('gateway/.env', `PORT=4000
CORS_ORIGIN=http://localhost:5173

USER_URL=http://localhost:4001/graphql
ACCOUNT_URL=http://localhost:4002/graphql
OPPORTUNITY_URL=http://localhost:4003/graphql
ESTIMATION_URL=http://localhost:4004/graphql
APPROVAL_URL=http://localhost:4005/graphql
RFP_URL=http://localhost:4006/graphql
DOCUMENT_URL=http://localhost:4007/graphql
NOTIFICATION_URL=http://localhost:4008/graphql
REPORTING_AUDIT_URL=http://localhost:4009/graphql
ADMIN_URL=http://localhost:4010/graphql
`);

// ---------------------------------------------------------------
// 2. services/<name>/   (covers every service, including admin)
// ---------------------------------------------------------------
let port = 4000;

Object.entries(SERVICES).forEach(([name, cfg]) => {
  port += 1;
  const base = `services/${name}`;
  const S = `${base}/src`;
  const ts = !!cfg.typescript;
  const ext = ts ? 'ts' : 'js';

  // ---- config/
  // The docx leaves config/ empty for some services, but index.js needs
  // env.js and every repository needs db.js — so both are always written.
  file(`${S}/config/env.${ext}`, ts ? envTs(port) : envJs(port));
  file(`${S}/config/db.${ext}`, ts ? dbTs : dbJs);

  // ---- graphql/typeDefs/
  if (cfg.typeDefs && cfg.typeDefs.length) {
    cfg.typeDefs.forEach((t) => {
      const body = `\`
  type ${pascal(t)} {
    id: Int!
  }

  extend type Query {
    ${camel(t)}List: [${pascal(t)}]
  }
\`;
`;
      file(
        `${S}/graphql/typeDefs/${t}.typeDefs.${ext}`,
        ts ? `export default ${body}` : `module.exports = ${body}`
      );
    });
  } else {
    emptyDir(`${S}/graphql/typeDefs`);
  }

  // ---- graphql/resolvers/
  if (cfg.resolvers && cfg.resolvers.length) {
    cfg.resolvers.forEach((r) => {
      file(
        `${S}/graphql/resolvers/${r}.resolver.${ext}`,
        ts
          ? `import * as service from '../../services/${r}.service';

// Keep business logic OUT of resolvers.

export default {
  Query: {
    ${camel(r)}List: (_: unknown, args: Record<string, any>, ctx: unknown) => service.list(args, ctx),
  },
  Mutation: {},
};
`
          : `const service = require('../../services/${r}.service');

// Keep business logic OUT of resolvers.

module.exports = {
  Query: {
    ${camel(r)}List: (_, args, ctx) => service.list(args, ctx),
  },
  Mutation: {},
};
`
      );
    });
  } else {
    emptyDir(`${S}/graphql/resolvers`);
  }

  // ---- services/
  if (cfg.services && cfg.services.length) {
    cfg.services.forEach((s) => {
      const hasRepo = (cfg.repositories || []).includes(s);
      const hasValidator = (cfg.validators || []).includes(s);
      file(
        `${S}/services/${s}.service.${ext}`,
        ts
          ? `${hasRepo ? `import * as repository from '../repositories/${s}.repository';\n` : ''}${
              hasValidator ? `import * as validator from '../validators/${s}.validator';\n` : ''
            }
// Business rules and use-case logic for ${s}.

async function list(args: Record<string, any>, ctx: unknown) {
  ${hasRepo ? 'return repository.findAll();' : 'return [];'}
}

export { list };
`
          : `${hasRepo ? `const repository = require('../repositories/${s}.repository');\n` : ''}${
              hasValidator ? `const validator = require('../validators/${s}.validator');\n` : ''
            }
// Business rules and use-case logic for ${s}.

async function list(args, ctx) {
  ${hasRepo ? 'return repository.findAll();' : 'return [];'}
}

module.exports = { list };
`
      );
    });
  } else {
    emptyDir(`${S}/services`);
  }

  // ---- repositories/
  if (cfg.repositories && cfg.repositories.length) {
    cfg.repositories.forEach((r) => {
      file(
        `${S}/repositories/${r}.repository.${ext}`,
        ts
          ? `import { query, transaction } from '../config/db';

// ALL SQL for ${r}. Always use $1 parameters — never string concatenation.
// is_active = TRUE on master tables, is_current = TRUE on trackers.

export interface ${pascal(r)} {
  id: number;
}

async function findAll(): Promise<${pascal(r)}[]> {
  return [];
}

export { findAll };
`
          : `const { query, transaction } = require('../config/db');

// ALL SQL for ${r}. Always use $1 parameters — never string concatenation.
// is_active = TRUE on master tables, is_current = TRUE on trackers.

async function findAll() {
  return [];
}

module.exports = { findAll };
`
      );
    });
  } else {
    emptyDir(`${S}/repositories`);
  }

  // ---- validators/
  if (cfg.validators && cfg.validators.length) {
    cfg.validators.forEach((v) => {
      file(
        `${S}/validators/${v}.validator.${ext}`,
        ts
          ? `import { validationFailed } from '../../../../shared/errors/graphqlErrors';

// Input and business validation for ${v}.

function assertValid(input: Record<string, any>): void {
  const errors: string[] = [];
  // if (!input.name) errors.push('name is required');
  if (errors.length) throw validationFailed(errors.join(', '));
}

export { assertValid };
`
          : `const { validationFailed } = require('../../../../shared/errors/graphqlErrors');

// Input and business validation for ${v}.

function assertValid(input) {
  const errors = [];
  // if (!input.name) errors.push('name is required');
  if (errors.length) throw validationFailed(errors.join(', '));
}

module.exports = { assertValid };
`
      );
    });
  } else if (cfg.validators) {
    emptyDir(`${S}/validators`);
  }

  // ---- events/  (notification, reporting-audit)
  if (cfg.events) {
    file(
      `${S}/events/index.${ext}`,
      ts
        ? `// Event handlers. Cross-cutting services LISTEN only —
// they never call back into a business domain service.

function register(): void {
  // subscribe('opportunity.stage_changed', handler)
}

export { register };
`
        : `// Event handlers. Cross-cutting services LISTEN only —
// they never call back into a business domain service.

function register() {
  // subscribe('opportunity.stage_changed', handler)
}

module.exports = { register };
`
    );
  }

  // ---- storage/  (document)
  if (cfg.storage) {
    file(
      `${S}/storage/index.${ext}`,
      ts
        ? `// File storage integration for the document service.
// Local disk for now; swap for S3 behind the same two functions.

async function save(file: unknown): Promise<void> {
  throw new Error('Not implemented');
}

async function read(filePath: string): Promise<unknown> {
  throw new Error('Not implemented');
}

export { save, read };
`
        : `// File storage integration for the document service.
// Local disk for now; swap for S3 behind the same two functions.

async function save(file) {
  throw new Error('Not implemented');
}

async function read(filePath) {
  throw new Error('Not implemented');
}

module.exports = { save, read };
`
    );
  }

  // ---- index.js / index.ts  (service bootstrap)
  const tdImports = (cfg.typeDefs || [])
    .map((t) =>
      ts
        ? `import ${camel(t)}Types from './graphql/typeDefs/${t}.typeDefs';`
        : `const ${camel(t)}Types = require('./graphql/typeDefs/${t}.typeDefs');`
    )
    .join('\n');
  const rsImports = (cfg.resolvers || [])
    .map((r) =>
      ts
        ? `import ${camel(r)}Resolvers from './graphql/resolvers/${r}.resolver';`
        : `const ${camel(r)}Resolvers = require('./graphql/resolvers/${r}.resolver');`
    )
    .join('\n');

  const tdList = (cfg.typeDefs || []).map((t) => `${camel(t)}Types`).join(', ');
  const rsList = (cfg.resolvers || []).map((r) => `${camel(r)}Resolvers`).join(', ');

  const bootstrapHeader = ts
    ? `import 'dotenv/config';

import express from 'express';
import { parse } from 'graphql';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { buildSubgraphSchema } from '@apollo/subgraph';

import env from './config/env';
${tdImports}
${rsImports}`
    : `require('dotenv').config();

const express = require('express');
const { parse } = require('graphql');
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');
const { buildSubgraphSchema } = require('@apollo/subgraph');

const env = require('./config/env');
${tdImports}
${rsImports}`;

  const reduceAcc = ts ? '(acc: any, p: any)' : '(acc, p)';
  const parseMap = ts ? '(t: string) => parse(t)' : '(t) => parse(t)';

  file(
    `${S}/index.${ext}`,
    `${bootstrapHeader}

// ${cfg.comment}
// Built as a federation subgraph so the gateway can compose it —
// see @apollo/subgraph's buildSubgraphSchema.

const base = \`
  type Query { _empty: String }
  type Mutation { _empty: String }
\`;

const typeDefs = [base${tdList ? ', ' + tdList : ''}];

const parts = [${rsList}];
const resolvers = parts.reduce(
  ${reduceAcc} => ({
    Query: { ...acc.Query, ...(p.Query || {}) },
    Mutation: { ...acc.Mutation, ...(p.Mutation || {}) },
  }),
  { Query: {}, Mutation: {} }
);

const schema = buildSubgraphSchema({ typeDefs: typeDefs.map(${parseMap}), resolvers });

async function start() {
  const app = express();
  app.use(express.json());

  const server = new ApolloServer({ schema });
  await server.start();
  app.use('/graphql', expressMiddleware(server));

  app.get('/health', (req, res) => res.json({ status: 'ok', service: '${name}' }));

  app.listen(env.port, () =>
    console.log('${name} service ready on http://localhost:' + env.port + '/graphql')
  );
}

start().catch((err) => {
  console.error('${name} failed to start:', err);
  process.exit(1);
});
`
  );

  if (ts) {
    file(`${base}/tsconfig.json`, tsconfigJson);
    file(`${base}/package.json`, pkgJsonTs(name, port));
  } else {
    file(`${base}/package.json`, pkgJson(name, port));
  }

  file(`${base}/.env`, envFile(port, cfg.ownDb ? `xts_${name}` : 'xts'));

  // Service with its own database gets its own DDL file too.
  if (cfg.ownDb) {
    file(
      `database/services/${name}/schema.sql`,
      `-- DDL for the \`xts_${name}\` database only.\n-- Paste ${name} DDL here.\n`
    );
  }
});

// ---------------------------------------------------------------
// 3. shared/
// ---------------------------------------------------------------
file('shared/auth/roles.js', `// Menu building reads tblrole_menu.

module.exports = {
  menusForRole: async (roleId) => [],
};
`);

file('shared/auth/permissions.js', `// The ONE permission check. Every service uses this.
// Reads tblrole_permissions.

async function can(user, permissionKey) {
  if (!user || !user.roleId) return false;
  return false;
}

module.exports = { can };
`);

file('shared/errors/errorCodes.js', `module.exports = {
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  FORBIDDEN: 'FORBIDDEN',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  CONFLICT: 'CONFLICT',
};
`);

file('shared/errors/graphqlErrors.js', `const { GraphQLError } = require('graphql');
const CODES = require('./errorCodes');

const make = (code) => (message, extra = {}) =>
  new GraphQLError(message, { extensions: { code, ...extra } });

module.exports = {
  notFound: make(CODES.NOT_FOUND),
  validationFailed: make(CODES.VALIDATION_FAILED),
  forbidden: make(CODES.FORBIDDEN),
  unauthenticated: make(CODES.UNAUTHENTICATED),
  conflict: make(CODES.CONFLICT),
};
`);

file('shared/utils/logger.js', `module.exports = {
  info: (...a) => console.log('[info]', ...a),
  warn: (...a) => console.warn('[warn]', ...a),
  error: (...a) => console.error('[error]', ...a),
};
`);

file('shared/utils/pagination.js', `const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

function toLimitOffset({ page = 1, pageSize = DEFAULT_LIMIT } = {}) {
  const limit = Math.min(Math.max(Number(pageSize) || DEFAULT_LIMIT, 1), MAX_LIMIT);
  const offset = (Math.max(Number(page) || 1, 1) - 1) * limit;
  return { limit, offset };
}

module.exports = { toLimitOffset, DEFAULT_LIMIT, MAX_LIMIT };
`);

file('shared/utils/date.js', `function toIso(value) {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

module.exports = { toIso };
`);

file('shared/constants/status.js', `// Values for FK columns with no lookup table in schema.sql yet:
// opportunity_type_id, source_type_id, role_in_decision, pre_bidmeeting.

module.exports = {
  OPPORTUNITY_TYPE: {},
  SOURCE_TYPE: {},
  ROLE_IN_DECISION: {},
};
`);

file('shared/constants/stages.js', `// Stage names live in msttbl_stage / msttbl_sub_stage.
// Only put IDs here that the code must reference directly.

module.exports = {};
`);

// ---------------------------------------------------------------
// 4. database/
// ---------------------------------------------------------------
emptyDir('database/migrations');
emptyDir('database/seeds');
file('database/schema.sql', '-- Paste your DDL here.\n');
// database/services/<name>/schema.sql is written per-service above,
// for every service with ownDb: true.

// ---------------------------------------------------------------
// 5. Root files
// ---------------------------------------------------------------
file(
  'package.json',
  JSON.stringify(
    {
      name: 'xts-backend',
      version: '1.0.0',
      private: true,
      // shared/ sits outside every service's node_modules, so anything it
      // requires must be installed here at the root.
      dependencies: { graphql: '16.10.0' },
      scripts: {
        'install:all':
          'npm install && cd gateway && npm install && cd ../services/user && npm install && cd ../account && npm install && cd ../opportunity && npm install && cd ../estimation && npm install && cd ../approval && npm install && cd ../rfp && npm install && cd ../document && npm install && cd ../notification && npm install && cd ../reporting-audit && npm install && cd ../admin && npm install',
      },
    },
    null,
    2
  ) + '\n'
);

file('.env.example', `# Each service has its own .env — this is the template.

PORT=4001

DB_HOST=localhost
DB_PORT=5432
DB_NAME=xts
DB_USER=postgres
DB_PASSWORD=
DB_POOL_MAX=10
`);

file('.gitignore', `node_modules/
.env
*.log
dist/
`);

file('README.md', `# XTS Opportunity Tracker — Backend

Node.js + GraphQL + PostgreSQL. No Docker.

## Structure

    gateway/     GraphQL gateway — single client-facing endpoint
    services/    Business domain microservices
    shared/      Technical utilities (auth, errors, utils, constants)
    database/    schema.sql, migrations, seeds

Database-per-service migration in progress: each service is moving to its own
PostgreSQL database (e.g. \`xts_account\`) instead of the one shared \`xts\` DB.
Per-service DDL lives under \`database/services/<service>/schema.sql\`.
Piloted so far: **account** (TypeScript + \`xts_account\`).

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

\`account\` is TypeScript — build once (or run its dev script, which uses
\`tsx watch\`) before \`npm start\`:

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
`);

console.log(`Done. ${created} files created, ${skipped} already existed.\n`);
console.log('Next:');
console.log('  1. Paste your DDL into backend/database/schema.sql (and per-service schema.sql files)');
console.log('  2. cd backend && npm run install:all');
console.log('  3. Start each service, then the gateway last\n');
console.log('NOTE: the gateway needs @apollo/gateway and each service needs');
console.log('      @apollo/subgraph to federate. Both are in the package.json files.\n');
