import 'dotenv/config';

import express from 'express';
import { parse } from 'graphql';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { buildSubgraphSchema } from '@apollo/subgraph';

import env from './config/env';
import opportunityTypes from './graphql/typeDefs/opportunity.typeDefs';
import stageTypes from './graphql/typeDefs/stage.typeDefs';
import opportunityResolvers from './graphql/resolvers/opportunity.resolver';
import stageResolvers from './graphql/resolvers/stage.resolver';

// Opportunity & Pipeline

const base = `
  type Query { _empty: String }
  type Mutation { _empty: String }
`;

const typeDefs = [base, opportunityTypes, stageTypes];

const parts = [opportunityResolvers, stageResolvers];
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

  app.get('/health', (req, res) => res.json({ status: 'ok', service: 'opportunity' }));

  app.listen(env.port, () =>
    console.log('opportunity service ready on http://localhost:' + env.port + '/graphql')
  );
}

start().catch((err) => {
  console.error('opportunity failed to start:', err);
  process.exit(1);
});
