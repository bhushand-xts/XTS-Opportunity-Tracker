// ISOLATED VISUAL TEST ONLY: production has no import of this harness.
import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { MockedProvider } from "@apollo/client/testing";
import { gql } from "@apollo/client";
import { AppShell, Toaster } from "@xts/design-system";
import "../../../frontend/packages/@xts/design-system/src/styles/globals.css";
import "../../../frontend/packages/@xts/mfe-opportunity/src/opportunity.css";
import { PipelinePage } from "../../../frontend/packages/@xts/mfe-opportunity/src/components/PipelinePage";
import { OpportunityFormPage } from "../../../frontend/packages/@xts/mfe-opportunity/src/components/OpportunityFormPage";
import { OpportunityDetailsPage } from "../../../frontend/packages/@xts/mfe-opportunity/src/components/OpportunityDetailsPage";
import { OpportunityServiceContext, productionOpportunityService } from "../../../frontend/packages/@xts/mfe-opportunity/src/services/OpportunityService";
import { OpportunityAccessContext } from "../../../frontend/packages/@xts/mfe-opportunity/src/hooks/useOpportunityAccess";
import { UnsavedProvider } from "../../../frontend/packages/@xts/mfe-opportunity/src/hooks/useUnsaved";
import { GET_OPPORTUNITY_OWNER_DIRECTORY } from "../../../frontend/packages/@xts/mfe-opportunity/src/services/userDirectory.queries";
import { GET_RFP_QUESTION_TEMPLATES } from "../../../frontend/packages/@xts/mfe-opportunity/src/services/rfpQuestion.queries";
import { fixtureOpportunity, TEST_LOOKUPS } from "../../../frontend/packages/@xts/mfe-opportunity/src/testing/fixtures";
const scenario = new URLSearchParams(location.search).get("scenario") ?? "pipeline";
let record = fixtureOpportunity();
if (scenario === "generic") record.form.rfp.type = "GENERIC";
if (scenario === "sales" || scenario === "ceo") {
  record.state = scenario === "sales" ? "SALES_REVIEW" : "GATE1_PENDING";
  record.packageRevision = 2;
  record.allowedActions = scenario === "sales" ? ["SALES_APPROVE", "SALES_REJECT"] : ["GATE1_GO", "GATE1_NO_GO"];
  record.responses![0] = { ...record.responses![0], state: "APPROVED", approvedRevision: 1, submittedRevision: 1 };
  if (scenario === "ceo") record.salesRecommendation = { actor: record.responses![0].reviewer!, note: "Test submitted package recommendation.", packageRevision: 2 };
}
const service = { ...productionOpportunityService,
  lookups: async () => TEST_LOOKUPS,
  detail: async () => record,
  list: async () => ({ nodes: scenario === "empty" ? [] : [record], totalCount: scenario === "empty" ? 0 : 1, endCursor: null, hasNextPage: false }),
  clients: async () => ({ nodes: [record.client!], totalCount: 1, endCursor: null, hasNextPage: false }),
  eligibleUsers: async () => ({ nodes: [record.owner!, record.responses![0].reviewer!], totalCount: 2, endCursor: null, hasNextPage: false }),
};
const menuQuery = gql`query GetOpportunityMenus { menus(asTree: false) { menuId menuName menuKey icon parentId sortOrder routePath isActive } }`;
// Verified catalog identities/status/routes with synthetic ordering and business grants.
const mocks = [{ request: { query: menuQuery }, result: { data: { menus: [
  { menuId: 12, menuName: "Opportunities", menuKey: "opportunities", icon: "ListChecks", parentId: null, sortOrder: 2, routePath: null, isActive: true },
  { menuId: 29, menuName: "Opportunity Management", menuKey: "opportunity_management", icon: "ListChecks", parentId: null, sortOrder: 3, routePath: "/opportunities", isActive: true },
  { menuId: 28, menuName: "Opportunity Tracking", menuKey: "opportunity_tracking", icon: "ListChecks", parentId: null, sortOrder: 4, routePath: null, isActive: false },
  { menuId: 5, menuName: "Permission Master", menuKey: "permission_master", icon: "Key", parentId: null, sortOrder: 5, routePath: "/admin/menu-management/permission-master", isActive: true },
] } }, maxUsageCount: 100 }];
const masterMocks = [
  { request: { query: GET_OPPORTUNITY_OWNER_DIRECTORY }, result: { data: {
    userList: [{ id: 101, firstName: "Test", lastName: "Owner", email: "owner@example.test", roleId: 1, isActive: true }, { id: 102, firstName: "Test", lastName: "Reviewer", email: "reviewer@example.test", roleId: 1, isActive: true }],
    rolesList: [{ id: 1, roleName: "Visual fixture", roleCode: "TEST", isActive: true }],
  } }, maxUsageCount: 100 },
  { request: { query: GET_RFP_QUESTION_TEMPLATES }, result: { data: { rfpQuestionsList: [{ id: 17, question: "Test standard delivery question", description: "Visual template fixture", displayOrder: 1, isActive: true, createdDt: null, updatedDt: null }] } }, maxUsageCount: 100 },
];
createRoot(document.getElementById("root")!).render(<MockedProvider mocks={[...mocks, ...masterMocks]}><BrowserRouter><OpportunityServiceContext.Provider value={service}><OpportunityAccessContext.Provider value={{ userId: "101", view: true, add: true, edit: true, work: true, approvals: true }}><UnsavedProvider><AppShell><div className="opportunity-root"><Routes><Route path="/opportunity" element={<PipelinePage />} /><Route path="/opportunity/new" element={<OpportunityFormPage />} /><Route path="/opportunity/:id/edit" element={<OpportunityFormPage />} /><Route path="/opportunity/:id/details" element={<OpportunityDetailsPage />} /><Route path="/opportunity/:id/review" element={<OpportunityDetailsPage review />} /></Routes></div></AppShell><Toaster /></UnsavedProvider></OpportunityAccessContext.Provider></OpportunityServiceContext.Provider></BrowserRouter></MockedProvider>);
