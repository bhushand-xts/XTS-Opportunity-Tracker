import { ApolloClient, HttpLink, InMemoryCache, type NormalizedCacheObject } from "@apollo/client";
import { setContext } from "@apollo/client/link/context";

// The gateway endpoint. Overridable via frontend/.env's GRAPHQL_API_URL
// (see frontend/.env.example) — injected at build time by each app's webpack
// config via dotenv-webpack. Defaults to the gateway running locally.
const GRAPHQL_API_URL = process.env.GRAPHQL_API_URL || "http://localhost:4000/graphql";

// Same localStorage key @xts/design-system's auth.ts persists the session
// under. Read directly (not imported) because design-system already depends
// on this package — importing it back would be a circular dependency.
const AUTH_STORAGE_KEY = "authState";

function readAuthToken(): string | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as { session?: { token?: string } };
    return parsed.session?.token;
  } catch {
    return undefined;
  }
}

const authLink = setContext((_operation, { headers }) => {
  const token = readAuthToken();
  return {
    headers: {
      ...headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };
});

export function createApolloClient(): ApolloClient<NormalizedCacheObject> {
  return new ApolloClient({
    link: authLink.concat(new HttpLink({ uri: GRAPHQL_API_URL })),
    cache: new InMemoryCache({
      // These backend types identify themselves by `menuId` / `permissionId`
      // rather than the `id` Apollo looks for by default.
      typePolicies: {
        Menu: { keyFields: ["menuId"] },
        Permission: { keyFields: ["permissionId"] },
      },
    }),
  });
}

let sharedClient: ApolloClient<NormalizedCacheObject> | undefined;

/** One client (and one cache) for the whole app. The app shell and the
 * admin MFE both call this, so they share data instead of each keeping
 * their own copy. */
export function getApolloClient(): ApolloClient<NormalizedCacheObject> {
  sharedClient ??= createApolloClient();
  return sharedClient;
}
