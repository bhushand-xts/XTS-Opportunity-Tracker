import React from "react";

export function App() {
  return (
    <div style={{ padding: "20px", backgroundColor: "white", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
      <h2>✅ Approval & Submission MFE</h2>
      <p>This MFE is loaded dynamically via Module Federation!</p>
      <ul>
        <li>Submit bids for approval</li>
        <li>CEO Go/No-Go decisions</li>
        <li>Final approval workflow</li>
      </ul>
      <p style={{ color: "#666", fontSize: "12px", marginTop: "20px" }}>Running on port 3004</p>
    </div>
  );
}

export default App;
