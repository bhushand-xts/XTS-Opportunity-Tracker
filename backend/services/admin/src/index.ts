import 'dotenv/config';

import express from 'express';
import { parse } from 'graphql';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { buildSubgraphSchema } from '@apollo/subgraph';

import env from './config/env';
import { buildContext } from './graphql/context';
import menusTypes from './graphql/typeDefs/menus.typeDefs';
import permissionsTypes from './graphql/typeDefs/permissions.typeDefs';
import phasesTypes from './graphql/typeDefs/phases.typeDefs';
import proposalSectionsTypes from './graphql/typeDefs/proposal-sections.typeDefs';
import rateMasterTypes from './graphql/typeDefs/rate-master.typeDefs';
import reasonCodesTypes from './graphql/typeDefs/reason-codes.typeDefs';
import rfpQuestionsTypes from './graphql/typeDefs/rfp-questions.typeDefs';
import rolesTypes from './graphql/typeDefs/roles.typeDefs';
import stagesTypes from './graphql/typeDefs/stages.typeDefs';

import subStagesTypes from './graphql/typeDefs/sub-stages.typeDefs';
import menusResolvers from './graphql/resolvers/menus.resolver';
import permissionsResolvers from './graphql/resolvers/permissions.resolver';
import phasesResolvers from './graphql/resolvers/phases.resolver';
import proposalSectionsResolvers from './graphql/resolvers/proposal-sections.resolver';
import rateMasterResolvers from './graphql/resolvers/rate-master.resolver';
import reasonCodesResolvers from './graphql/resolvers/reason-codes.resolver';
import rfpQuestionsResolvers from './graphql/resolvers/rfp-questions.resolver';
import rolesResolvers from './graphql/resolvers/roles.resolver';
import stagesResolvers from './graphql/resolvers/stages.resolver';
import subStagesResolvers from './graphql/resolvers/sub-stages.resolver';



import accessTypes from './graphql/typeDefs/access.typeDefs';
import accessResolvers from './graphql/resolvers/access.resolver';
import currencyTypes from './graphql/typeDefs/currency.typeDefs';
import currencyResolvers from './graphql/resolvers/currency.resolver';
import accountTypeTypes from './graphql/typeDefs/account-type.typeDefs';
import accountTypeResolvers from './graphql/resolvers/account-type.resolver';
import industryTypes from './graphql/typeDefs/industry.typeDefs';
import industryResolvers from './graphql/resolvers/industry.resolver';

// Administration — master data and access control

const base = `
  type Query { _empty: String }
  type Mutation { _empty: String }
`;

const typeDefs = [base, menusTypes, permissionsTypes, phasesTypes, proposalSectionsTypes, rateMasterTypes, reasonCodesTypes, rfpQuestionsTypes, rolesTypes, stagesTypes, subStagesTypes, accessTypes, currencyTypes, accountTypeTypes, industryTypes];

const parts = [menusResolvers, permissionsResolvers, phasesResolvers, proposalSectionsResolvers, rateMasterResolvers, reasonCodesResolvers, rfpQuestionsResolvers, rolesResolvers, stagesResolvers, subStagesResolvers,accessResolvers, currencyResolvers, accountTypeResolvers, industryResolvers];
// Merges every top-level key each resolver file exports (Query, Mutation,
// and any type-level field resolver like Stage.inUse) -- not just
// Query/Mutation. A plain Query/Mutation-only file merges exactly the same
// as before; this only adds support for the type resolvers newer features
// need (see stages.resolver.ts / sub-stages.resolver.ts).
const resolvers = parts.reduce((acc: any, p: any) => {
  for (const typeName of Object.keys(p)) {
    acc[typeName] = { ...(acc[typeName] || {}), ...p[typeName] };
  }
  return acc;
}, { Query: {}, Mutation: {} });

const schema = buildSubgraphSchema({ typeDefs: typeDefs.map((t: string) => parse(t)), resolvers });

async function start() {
  const app = express();
  app.use(express.json());

  const server = new ApolloServer({ schema });
  await server.start();
  app.use('/graphql', expressMiddleware(server, { context: async ({ req }) => buildContext({ req }) }));

  app.get('/health', (req, res) => res.json({ status: 'ok', service: 'admin' }));

  app.listen(env.port, () =>
    console.log('admin service ready on http://localhost:' + env.port + '/graphql')
  );
}

start().catch((err) => {
  console.error('admin failed to start:', err);
  process.exit(1);
});
