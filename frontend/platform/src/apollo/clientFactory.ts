// One Apollo Client config shared by the shell and, where an MFE runs
// standalone in dev (via bootstrap.tsx), by each remote too. In the
// composed app there is exactly one ApolloClient instance -- the shell's
// -- shared across remotes as a Module Federation singleton.

import { ApolloClient, InMemoryCache, createHttpLink, from } from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import { onError } from "@apollo/client/link/error";

export function createApolloClient(getToken: () => string | null) {
  const httpLink = createHttpLink({
    uri: import.meta.env.VITE_GRAPHQL_URL ?? "/graphql",
  });

  const authLink = setContext((_, { headers }) => {
    const token = getToken();
    return {
      headers: {
        ...headers,
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
    };
  });

  // Errors carry a typed extensions.code (per the API design section) --
  // branch on that in real error handling, never on err.message.
  const errorLink = onError(({ graphQLErrors, networkError }) => {
    graphQLErrors?.forEach((err) =>
      console.error("[graphql]", err.extensions?.code, err.message)
    );
    if (networkError) console.error("[network]", networkError);
  });

  return new ApolloClient({
    link: from([errorLink, authLink, httpLink]),
    cache: new InMemoryCache(),
  });
}
