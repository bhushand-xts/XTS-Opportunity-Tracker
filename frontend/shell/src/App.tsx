import { ApolloProvider } from "@apollo/client";
import { AuthProvider, useSession } from "./auth/AuthProvider";
import { apolloClient } from "./graphql/apolloClient";
import { AppRouter } from "./router";

function AuthedApp() {
  const { isLoading } = useSession();
  if (isLoading) return <div className="app-loading">Signing you in…</div>;
  return <AppRouter />;
}

export function App() {
  return (
    <AuthProvider>
      <ApolloProvider client={apolloClient}>
        <AuthedApp />
      </ApolloProvider>
    </AuthProvider>
  );
}
