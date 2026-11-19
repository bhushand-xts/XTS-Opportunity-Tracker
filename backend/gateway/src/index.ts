import 'dotenv/config';

import express from 'express';
import cors from 'cors';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';

import env from './config/env';
import gateway from './graphql/gateway';
import auth from './middleware/auth.middleware';
import { extractionProxy } from './routes/extraction';

async function start() {
  const app = express();
  app.use(cors({ origin: env.corsOrigin }));
  app.use(auth);
  // Mounted before express.json() so uploads stream through untouched.
  app.use('/api/question-extractions', extractionProxy);
  app.use(express.json());

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

// On container startup (especially a cold `docker compose up -d` right after
// a host reboot), the subgraphs can report healthy before Docker's embedded
// DNS has the hostname ready, so introspection fails with EAI_AGAIN even
// though depends_on already waited for service_healthy. Retry in-process for
// up to a minute before giving up — far faster than waiting on Docker's own
// (slow, backing-off) `restart: on-failure` to cycle the whole container.
async function startWithRetry(maxAttempts = 20, delayMs = 3000) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await start();
      return;
    } catch (err) {
      if (attempt === maxAttempts) throw err;
      console.error(`Gateway failed to start (attempt ${attempt}/${maxAttempts}), retrying in ${delayMs}ms:`, err);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
}

startWithRetry().catch((err) => {
  console.error('Gateway failed to start:', err);
  process.exit(1);
});
