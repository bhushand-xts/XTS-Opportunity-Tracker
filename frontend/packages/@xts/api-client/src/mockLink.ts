import { ApolloLink, Observable, type FetchResult } from "@apollo/client";

/**
 * Generic (not feature-specific) mock transport for Apollo Client. Lets a
 * feature register a resolver per GraphQL operation name and get realistic
 * async/latency behavior — so loading and error states in the UI are
 * genuinely exercised — without a real server. Swap `createMockLink()` for
 * a real `HttpLink` in apolloClient.ts once the backend exists; nothing
 * that calls `useQuery`/`useMutation` needs to change.
 */
export type MockResolver = (variables: Record<string, unknown>) => unknown | Promise<unknown>;

const resolvers = new Map<string, MockResolver>();

export function registerMockResolver(operationName: string, resolver: MockResolver): void {
  resolvers.set(operationName, resolver);
}

export function createMockLink(latencyMs = 300): ApolloLink {
  return new ApolloLink((operation) => {
    const operationName = operation.operationName;
    const resolver = resolvers.get(operationName);

    return new Observable<FetchResult>((observer) => {
      const timer = setTimeout(() => {
        if (!resolver) {
          observer.error(new Error(`No mock resolver registered for operation "${operationName}"`));
          return;
        }
        Promise.resolve(resolver(operation.variables))
          .then((data) => {
            observer.next({ data } as FetchResult);
            observer.complete();
          })
          .catch((error: Error) => observer.error(error));
      }, latencyMs);

      return () => clearTimeout(timer);
    });
  });
}
