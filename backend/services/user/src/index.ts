import 'dotenv/config';

import express from 'express';
import path from 'path';
import { parse } from 'graphql';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { buildSubgraphSchema } from '@apollo/subgraph';

import env from './config/env';
import userTypes from './graphql/typeDefs/user.typeDefs';
import userResolvers from './graphql/resolvers/user.resolver';

// User, authentication & SSO

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

  app.get('/login', (_req, res) =>
    res.sendFile(path.join(process.cwd(), 'src', 'public', 'login.html'))
  );

  app.get('/admin', (_req, res) =>
    res.sendFile(path.join(process.cwd(), 'src', 'public', 'admin.html'))
  );

  // Same-origin bridge from the dashboard to the admin microservice.
  app.post('/admin-api/graphql', async (req, res) => {
    try {
      const response = await fetch(env.adminServiceUrl, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: req.header('authorization') || '',
        },
        body: JSON.stringify(req.body),
      });
      res.status(response.status).json(await response.json());
    } catch (error) {
      res.status(502).json({ errors: [{ message: 'Admin service is unavailable.' }] });
    }
  });

  app.get('/health', (req, res) => res.json({ status: 'ok', service: 'user' }));

  app.listen(env.port, () =>
    console.log('user service ready on http://localhost:' + env.port + '/graphql')
  );
}

start().catch((err) => {
  console.error('user failed to start:', err);
  process.exit(1);
});
