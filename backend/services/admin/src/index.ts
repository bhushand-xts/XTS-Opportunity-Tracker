import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import { buildSubgraphSchema } from "@apollo/subgraph";
import { gql } from "graphql-tag";

import { menuTypeDefs } from "./graphql/typeDefs/menus.typeDefs";
import {
  permissionTypeDefs
} from "./graphql/typeDefs/permissions.typeDefs";

import { menuResolvers } from "./graphql/resolvers/menus.resolver";
import {
  permissionResolvers
} from "./graphql/resolvers/permissions.resolver";

import { env } from "./config/env";

const typeDefs = gql`
  type Query {
    _adminHealth: String
  }

  type Mutation {
    _adminMutation: String
  }

  ${menuTypeDefs}

  ${permissionTypeDefs}
`;

const resolvers = {
  Query: {
    ...menuResolvers.Query,
    ...permissionResolvers.Query,

    _adminHealth: () => "Admin service is running"
  },

  Mutation: {
    ...menuResolvers.Mutation,
    ...permissionResolvers.Mutation
  }
};

const schema = buildSubgraphSchema({
  typeDefs,
  resolvers
});

const server = new ApolloServer({
  schema
});

async function startServer(): Promise<void> {

  try {

    const { url } = await startStandaloneServer(
      server,
      {
        listen: {
          port: env.port
        }
      }
    );

    console.log(
      `Admin service running at ${url}`
    );

  } catch (error) {

    console.error(
      "Failed to start admin service:",
      error
    );

    process.exit(1);
  }
}

startServer();