import { ApolloClient, HttpLink, InMemoryCache, type NormalizedCacheObject } from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import { createMockLink } from "./mockLink";

/**
 * The entire backend cutover is this one flag. Flip to `false` once the
 * backend team has a real GraphQL endpoint — nothing in any feature's
 * useQuery/useMutation calls needs to change.
 */
export const USE_MOCK_GRAPHQL = false;

// Overridable via frontend/.env's GRAPHQL_API_URL (see frontend/.env.example)
// — injected at build time by each app's webpack config via dotenv-webpack.
// Defaults to the common case: gateway running locally alongside this app.
// A bare "/graphql" only works if the backend is reverse-proxied under the
// same origin as the frontend, or if webpack-dev-server's `proxy` option
// forwards it — this default is an absolute URL instead, so it works
// without either of those.
const GRAPHQL_API_URL = process.env.GRAPHQL_API_URL || "http://localhost:4000/graphql";

// Not read via @xts/design-system's auth.ts to avoid a circular package
// dependency (design-system already depends on api-client) — "authState"
// is the same localStorage key auth.ts persists Login/RegisterUser's
// AuthPayload under; keep both in sync if that shape changes.
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
  const transportLink = USE_MOCK_GRAPHQL ? createMockLink() : new HttpLink({ uri: GRAPHQL_API_URL });
  return new ApolloClient({
    link: authLink.concat(transportLink),
    cache: new InMemoryCache(),
  });
}
