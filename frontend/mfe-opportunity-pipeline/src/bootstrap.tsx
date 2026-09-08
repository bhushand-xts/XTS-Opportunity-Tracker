// Standalone dev entry point -- lets Opportunity & Pipeline run and be worked on
// without the shell (npm run dev inside this folder). The composed app
// never loads this file; it loads src/Module.tsx through Module Federation.

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ApolloProvider } from "@apollo/client";
import { createApolloClient } from "@xts/platform";
import "@xts/design-system";
import Module from "./Module";

const apolloClient = createApolloClient(() => null);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ApolloProvider client={apolloClient}>
      <Module />
    </ApolloProvider>
  </StrictMode>
);
