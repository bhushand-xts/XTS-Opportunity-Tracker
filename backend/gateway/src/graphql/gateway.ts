import {
  ApolloGateway,
  IntrospectAndCompose
} from "@apollo/gateway";

import { services } from "../config/services";

export const gateway = new ApolloGateway({

  supergraphSdl: new IntrospectAndCompose({

    subgraphs: [
      {
        name: services.admin.name,
        url: services.admin.url
        
      }
    ]

  })

});