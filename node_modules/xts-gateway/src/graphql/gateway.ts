import { ApolloGateway, IntrospectAndCompose } from '@apollo/gateway';
import serviceList from '../config/services';

// Composes every domain service into one schema.
// NOTE: needs @apollo/gateway installed, and each service must expose
// a subgraph (@apollo/subgraph).

const gateway = new ApolloGateway({
  supergraphSdl: new IntrospectAndCompose({ subgraphs: serviceList }),
});

export default gateway;
