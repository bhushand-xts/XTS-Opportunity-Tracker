// ISOLATED VISUAL TEST ENTRY. Never imported by either production app.
localStorage.setItem("authState", JSON.stringify({ session: { userId: "101", email: "owner@example.test", token: "visual-fixture-only" }, profile: { first_name: "Test", last_name: "Owner", status: "approved" }, roleId: null, roleName: "Visual fixture", access: { opportunities: ["view", "add", "edit", "approve", "reject"], opportunity_management: ["view", "add", "edit", "approve", "reject"] } }));
import("./preview");
