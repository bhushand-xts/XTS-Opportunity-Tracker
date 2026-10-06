import React, { Suspense } from "react";
import { ApolloProvider } from "@apollo/client";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { getApolloClient } from "@xts/api-client";
import { AppShell, AuthGate, Spinner } from "@xts/design-system";
import { ErrorBoundary } from "./ErrorBoundary";
import { ScrollToTop } from "./ScrollToTop";

// Remote MFEs are loaded on demand via Module Federation (see webpack.config.js).
const AdminMFE = React.lazy(() => import("admin/App"));
const OpportunityMFE = React.lazy(() => import("opportunity/App"));

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
          <ScrollToTop />
          <AuthGate>
            <AppShell>
              <Suspense fallback={<LoadingFallback label="Loading module…" />}>
                <Routes>
                  {/* The pipeline mockup's home screen is Pipeline itself, not a
                      separate dashboard — the sidebar's "Dashboard" link now
                      points at /opportunities (see AppShell.tsx). A stale
                      /dashboard link falls through to the catch-all below. */}
                  <Route path="/admin/*" element={<AdminMFE />} />
                  <Route path="/opportunities/*" element={<OpportunityMFE />} />
                  <Route path="*" element={<Navigate to="/opportunities" replace />} />
                </Routes>
              </Suspense>
            </AppShell>
          </AuthGate>
        </Router>
      </ApolloProvider>
    </ErrorBoundary>
  );
}
