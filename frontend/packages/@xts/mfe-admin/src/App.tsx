import React, { useState, useEffect } from "react";
import { Login } from "./Login";

export function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("userEmail");
    if (stored) {
      setUserEmail(stored);
      setIsLoggedIn(true);
    }
  }, []);

  const handleLogin = (email: string) => {
    setUserEmail(email);
    setIsLoggedIn(true);
    localStorage.setItem("userEmail", email);
  };

  const handleLogout = () => {
    setUserEmail("");
    setIsLoggedIn(false);
    localStorage.removeItem("userEmail");
  };

  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div style={{ padding: "20px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
          paddingBottom: "20px",
          borderBottom: "1px solid #e5e7eb",
        }}
      >
        <h2 style={{ margin: 0 }}>👤 Admin & Access Management</h2>
        <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
          <span style={{ color: "#6b7280", fontSize: "14px" }}>{userEmail}</span>
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
      </div>

      <div
        style={{
          padding: "20px",
          backgroundColor: "white",
          borderRadius: "8px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        }}
      >
        <h3>Welcome, {userEmail}!</h3>
        <p>This MFE is loaded dynamically via Module Federation!</p>
        <ul>
          <li>Manage users</li>
          <li>Manage roles and permissions</li>
          <li>View audit logs</li>
        </ul>
        <p style={{ color: "#666", fontSize: "12px", marginTop: "20px" }}>Running on port 3001</p>
      </div>
    </div>
  );
}

export default App;
