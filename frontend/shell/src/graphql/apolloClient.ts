import { createApolloClient } from "@xts/platform";
import { getToken } from "../auth/AuthProvider";

// The one ApolloClient instance for the whole composed app -- shared into
// every remote as a Module Federation singleton (see vite.config.ts),
// per the GraphQL contract.
export const apolloClient = createApolloClient(getToken);
