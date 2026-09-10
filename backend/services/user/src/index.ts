import 'dotenv/config';

import express from 'express';
import { parse } from 'graphql';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { buildSubgraphSchema } from '@apollo/subgraph';

import env from './config/env';
import userTypes from './graphql/typeDefs/user.typeDefs';
import userResolvers from './graphql/resolvers/user.resolver';

// User, authentication & SSO
// Built as a federation subgraph so the gateway can compose it —
// see @apollo/subgraph's buildSubgraphSchema.

const base = `
  type Query { _empty: String }
  type Mutation { _empty: String }
`;

const typeDefs = [base, userTypes];

const parts = [userResolvers];
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

  app.get('/health', (req, res) => res.json({ status: 'ok', service: 'user' }));

  app.listen(env.port, () =>
    console.log('user service ready on http://localhost:' + env.port + '/graphql')
  );
}

start().catch((err) => {
  console.error('user failed to start:', err);
  process.exit(1);
});
