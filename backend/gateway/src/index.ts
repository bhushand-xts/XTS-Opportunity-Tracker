import 'dotenv/config';

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
