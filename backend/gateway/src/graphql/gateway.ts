import { ApolloGateway, IntrospectAndCompose, RemoteGraphQLDataSource } from '@apollo/gateway';
import serviceList from '../config/services';

// Composes every domain service into one schema.
// NOTE: needs @apollo/gateway installed, and each service must expose
// a subgraph (@apollo/subgraph).

// Tells each service who is signed in, by adding an `x-user-id` header to every
// request the gateway sends on. The header is set here from the verified login
// (see auth.middleware.ts) — nothing the client sends is passed through.
class UserAwareDataSource extends RemoteGraphQLDataSource {
  willSendRequest({ request, context }: { request: { http?: { headers: { set(name: string, value: string): void } } }; context: any }) {
    const userId = context?.user?.id;
    if (userId) request.http?.headers.set('x-user-id', String(userId));
  }
}

const gateway = new ApolloGateway({
  supergraphSdl: new IntrospectAndCompose({ subgraphs: serviceList }),
  buildService: ({ url }) => new UserAwareDataSource({ url }),
});

export default gateway;
