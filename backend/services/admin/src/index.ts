import 'dotenv/config';

import express from 'express';
import { parse } from 'graphql';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { buildSubgraphSchema } from '@apollo/subgraph';

import env from './config/env';
import menusTypes from './graphql/typeDefs/menus.typeDefs';
import permissionsTypes from './graphql/typeDefs/permissions.typeDefs';
import phasesTypes from './graphql/typeDefs/phases.typeDefs';
import proposalSectionsTypes from './graphql/typeDefs/proposal-sections.typeDefs';
import rateMasterTypes from './graphql/typeDefs/rate-master.typeDefs';
import reasonCodesTypes from './graphql/typeDefs/reason-codes.typeDefs';
import roleMenuTypes from './graphql/typeDefs/role-menu.typeDefs';
import rolePermissionsTypes from './graphql/typeDefs/role-permissions.typeDefs';
import rolesTypes from './graphql/typeDefs/roles.typeDefs';
import stagesTypes from './graphql/typeDefs/stages.typeDefs';

import subStagesTypes from './graphql/typeDefs/sub-stages.typeDefs';
import menusResolvers from './graphql/resolvers/menus.resolver';
import permissionsResolvers from './graphql/resolvers/permissions.resolver';
import phasesResolvers from './graphql/resolvers/phases.resolver';
import proposalSectionsResolvers from './graphql/resolvers/proposal-sections.resolver';
import rateMasterResolvers from './graphql/resolvers/rate-master.resolver';
import reasonCodesResolvers from './graphql/resolvers/reason-codes.resolver';
import roleMenuResolvers from './graphql/resolvers/role-menu.resolver';
import rolePermissionsResolvers from './graphql/resolvers/role-permissions.resolver';
import rolesResolvers from './graphql/resolvers/roles.resolver';
import stagesResolvers from './graphql/resolvers/stages.resolver';
import subStagesResolvers from './graphql/resolvers/sub-stages.resolver';

// Administration — master data and access control

const base = `
  type Query { _empty: String }
  type Mutation { _empty: String }
`;

const typeDefs = [base, menusTypes, permissionsTypes, phasesTypes, proposalSectionsTypes, rateMasterTypes, reasonCodesTypes, roleMenuTypes, rolePermissionsTypes, rolesTypes, stagesTypes, subStagesTypes];

const parts = [menusResolvers, permissionsResolvers, phasesResolvers, proposalSectionsResolvers, rateMasterResolvers, reasonCodesResolvers, roleMenuResolvers, rolePermissionsResolvers, rolesResolvers, stagesResolvers, subStagesResolvers];
const resolvers = parts.reduce(
  (acc: any, p: any) => ({
    Query: { ...acc.Query, ...(p.Query || {}) },
    Mutation: { ...acc.Mutation, ...(p.Mutation || {}) },
  }),
  { Query: {}, Mutation: {} }
);

const schema = buildSubgraphSchema({ typeDefs: typeDefs.map((t: string) => parse(t)), resolvers });

async function start() {
  const app = express();
  app.use(express.json());

  const server = new ApolloServer({ schema });
  await server.start();
  app.use('/graphql', expressMiddleware(server));

  app.get('/health', (req, res) => res.json({ status: 'ok', service: 'admin' }));

  app.listen(env.port, () =>
    console.log('admin service ready on http://localhost:' + env.port + '/graphql')
  );
}

start().catch((err) => {
  console.error('admin failed to start:', err);
  process.exit(1);
});
