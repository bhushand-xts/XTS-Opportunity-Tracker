import 'dotenv/config';

import express from 'express';
import { parse, concatAST } from 'graphql';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { buildSubgraphSchema } from '@apollo/subgraph';

import env from './config/env';
import { buildContext } from './graphql/context';
import opportunityTypes from './graphql/typeDefs/opportunity.typeDefs';
import opportunityResolvers from './graphql/resolvers/opportunity.resolver';
import cors from 'cors';
import documentRoutes from './routes/document.routes';
import { canCreateClient } from './services/opportunity.service';

// Opportunity & Pipeline

const base = `
  type Query { _empty: String }
  type Mutation { _empty: String }
`;

const typeDefs = [base, opportunityTypes];

const parts = [opportunityResolvers];
const resolvers = parts.reduce(
  (acc: any, p: any) => ({
    ...acc,
    ...p,
    Query: { ...acc.Query, ...(p.Query || {}) },
    Mutation: { ...acc.Mutation, ...(p.Mutation || {}) },
  }),
  { Query: {}, Mutation: {} }
);

const schema = buildSubgraphSchema([
  { typeDefs: concatAST(typeDefs.map((t: string) => parse(t))), resolvers },
]);

async function start() {
  const app = express();
  app.use(express.json());
  app.use(
  '/documents',
  cors({
    origin: process.env.FRONTEND_ORIGIN || 'http://localhost:3000',
    allowedHeaders: ['Authorization', 'Content-Type'],
    methods: ['POST', 'GET', 'OPTIONS'],
  }),
  async (req, res, next) => {
    const authorization = req.header('authorization');

    if (!authorization?.startsWith('Bearer ')) {
      res.status(401).json({ message: 'Please sign in.' });
      return;
    }

    try {
      const response = await fetch(env.userServiceUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authorization,
        },
        body: JSON.stringify({ query: '{ currentUserId }' }),
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        res.status(401).json({ message: 'Unable to verify your login.' });
        return;
      }

      const result = await response.json() as {
        data?: { currentUserId?: number | null };
      };

      const id = result.data?.currentUserId;

      if (!id || !Number.isInteger(id)) {
        res.status(401).json({ message: 'Your login has expired.' });
        return;
      }

      if (req.method === 'POST' && !await canCreateClient({ user: { id } })) {
        res.status(403).json({ message: 'You cannot upload documents.' });
        return;
      }

      res.locals.userId = id;
      next();
    } catch {
      res.status(503).json({ message: 'Unable to verify upload access.' });
    }
  },
  documentRoutes
);

  const server = new ApolloServer({ schema });
  await server.start();
  app.use('/graphql', expressMiddleware(server, { context: async ({ req }) => buildContext({ req }) }));

  app.get('/health', (req, res) => res.json({ status: 'ok', service: 'opportunity' }));

  app.listen(env.port, () =>
    console.log('opportunity service ready on http://localhost:' + env.port + '/graphql')
  );
}

start().catch((err) => {
  console.error('opportunity failed to start:', err);
  process.exit(1);
});
