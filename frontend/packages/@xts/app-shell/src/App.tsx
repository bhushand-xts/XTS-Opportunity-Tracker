import React, { Suspense, useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from "react-router-dom";
import { MFE_CONFIG } from "./mfeConfig";
import { ErrorBoundary } from "./ErrorBoundary";

// Lazy load MFEs dynamically via Module Federation
const AdminMFE = React.lazy(() => import("admin/App"));
const OpportunityMFE = React.lazy(() => import("opportunity/App"));
const SolutionMFE = React.lazy(() => import("solution/App"));
const ApprovalMFE = React.lazy(() => import("approval/App"));
const DashboardMFE = React.lazy(() => import("dashboard/App"));

const MFE_COMPONENTS: Record<string, any> = {
  admin: AdminMFE,
  opportunity: OpportunityMFE,
  solution: SolutionMFE,
  approval: ApprovalMFE,
  dashboard: DashboardMFE,
};

function AppContent() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [isReady, setIsReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setIsReady(true);
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem("userEmail");
    if (stored) {
      setUserEmail(stored);
      setIsLoggedIn(true);
    }
  }, []);

  useEffect(() => {
    const handleStorageChange = () => {
      const stored = localStorage.getItem("userEmail");
      if (stored) {
        setUserEmail(stored);
        setIsLoggedIn(true);
      } else {
        setUserEmail("");
        setIsLoggedIn(false);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("userEmail");
    setUserEmail("");
    setIsLoggedIn(false);
    navigate("/");
  };

  if (!isReady) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "#666" }}>
        <h2>⏳ Initializing...</h2>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <Suspense fallback={<div style={{ padding: "20px", textAlign: "center", color: "#666" }}>⏳ Loading Login...</div>}>
        <AdminMFE />
      </Suspense>
    );
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f5f5f5" }}>
      {/* Header */}
      <header style={{ backgroundColor: "#003366", color: "white", padding: "20px", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
          <h1 style={{ margin: 0 }}>🏗️ XTS Opportunity Tracker</h1>
          <button
            onClick={handleLogout}
            style={{
              padding: "8px 16px",
              backgroundColor: "#ef4444",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            Logout
          </button>
        </div>
        <nav style={{ display: "flex", gap: "15px" }}>
          {Object.entries(MFE_CONFIG).map(([key, config]) =>
            config.enabled ? (
              <Link
                key={key}
                to={`/${key}`}
                style={{ color: "white", textDecoration: "none", fontSize: "14px" }}
              >
                {config.icon} {config.name}
              </Link>
            ) : null
          )}
        </nav>
      </header>

      {/* MFE Container */}
      <main style={{ padding: "20px", maxWidth: "1200px", margin: "0 auto" }}>
        <Suspense fallback={<div style={{ padding: "20px", textAlign: "center", color: "#666" }}>⏳ Loading MFE...</div>}>
          <Routes>
            {Object.entries(MFE_CONFIG).map(([key, config]) =>
              config.enabled ? (
                <Route
                  key={key}
                  path={`/${key}/*`}
                  element={React.createElement(MFE_COMPONENTS[key])}
                />
              ) : null
            )}
            <Route path="/" element={
              <div style={{ padding: "40px", backgroundColor: "white", borderRadius: "8px", textAlign: "center" }}>
                <h2>Welcome, {userEmail}!</h2>
                <p>Select a module from the navigation above to get started.</p>
              </div>
            } />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}

export function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AppContent />
      </Router>
    </ErrorBoundary>
  );
}
