import { ApolloClient, ApolloLink, HttpLink, InMemoryCache, type NormalizedCacheObject } from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import { onError } from "@apollo/client/link/error";

// The gateway endpoint. Overridable via frontend/.env's GRAPHQL_API_URL
// (see frontend/.env.example) — injected at build time by each app's webpack
// config via dotenv-webpack. Defaults to the gateway running locally.
const GRAPHQL_API_URL = process.env.GRAPHQL_API_URL || "http://localhost:4000/graphql";

// Same localStorage key @xts/design-system's auth.ts persists the session
// under. Read directly (not imported) because design-system already depends
// on this package — importing it back would be a circular dependency.
const AUTH_STORAGE_KEY = "authState";

export function readAuthToken(): string | undefined {
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

/** Fired on window when the stored login token is no longer valid. The auth
 * store in @xts/design-system listens for it and signs the user out, which
 * puts them back on the login screen. */
export const SESSION_EXPIRED_EVENT = "xts:session-expired";

let sessionCheck: Promise<void> | undefined;

/**
 * Asks the gateway who the stored token belongs to. `currentUserId` is null
 * only when the token is unknown or expired, so that answer (and nothing
 * else: a network failure or a server error is not an expired session) fires
 * SESSION_EXPIRED_EVENT. Concurrent calls share one request.
 */
export function checkSession(): Promise<void> {
  const token = readAuthToken();
  if (!token || typeof window === "undefined") return Promise.resolve();
  sessionCheck ??= fetch(GRAPHQL_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ query: "{ currentUserId }" }),
  })
    .then((response) => (response.ok ? response.json() : undefined))
    .then((result: { data?: { currentUserId?: number | null } } | undefined) => {
      if (result?.data && result.data.currentUserId === null && readAuthToken() === token) {
        window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
      }
    })
    .catch(() => undefined)
    .finally(() => {
      sessionCheck = undefined;
    });
  return sessionCheck;
}

// Any failed request may be the first sign of an expired login, so check.
const sessionCheckLink = onError(({ graphQLErrors, networkError }) => {
  const unauthorized = Boolean(networkError && "statusCode" in networkError && networkError.statusCode === 401);
  if (graphQLErrors?.length || unauthorized) void checkSession();
});

export function createApolloClient(): ApolloClient<NormalizedCacheObject> {
  return new ApolloClient({
    link: ApolloLink.from([sessionCheckLink, authLink, new HttpLink({ uri: GRAPHQL_API_URL })]),
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
