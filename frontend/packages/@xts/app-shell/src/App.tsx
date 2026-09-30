import React, { Suspense } from "react";
import { ApolloProvider } from "@apollo/client";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { getApolloClient } from "@xts/api-client";
import { AppShell, AuthGate, DashboardContent, Spinner } from "@xts/design-system";
import { ErrorBoundary } from "./ErrorBoundary";

// Remote MFEs are loaded on demand via Module Federation (see webpack.config.js).
const AdminMFE = React.lazy(() => import("admin/App"));

function LoadingFallback({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
      <Spinner className="size-4" />
      {label}
    </div>
  );
}

export function App() {
  return (
    <ErrorBoundary>
      <ApolloProvider client={getApolloClient()}>
        <Router>
          <AuthGate>
            <AppShell>
              <Suspense fallback={<LoadingFallback label="Loading module…" />}>
                <Routes>
                  <Route path="/dashboard" element={<DashboardContent />} />
                  <Route path="/admin/*" element={<AdminMFE />} />
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </Suspense>
            </AppShell>
          </AuthGate>
        </Router>
      </ApolloProvider>
    </ErrorBoundary>
  );
}
