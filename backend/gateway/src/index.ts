import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";

import { gateway } from "./graphql/gateway";
import { env } from "./config/env";

const server = new ApolloServer({
  gateway
});

async function startServer() {

  const { url } = await startStandaloneServer(
    server,
    {
      listen: {
        port: env.port
      }
    }
  );

  console.log(
    `API Gateway running at ${url}`
  );
}

startServer().catch((error) => {

  console.error(
    "Failed to start API Gateway:",
    error
  );

  process.exit(1);
});