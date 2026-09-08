import type { RouteManifest } from "@xts/platform";
import { OpportunityListPage } from "./pages/OpportunityListPage";
import { OpportunityDetailPage } from "./pages/OpportunityDetailPage";

export const routes: RouteManifest[] = [
  { path: "/", component: OpportunityListPage, requiredPermission: "opportunity:view", navLabel: "Opportunity & Pipeline" },
  { path: "/:id", component: OpportunityDetailPage, requiredPermission: "opportunity:view" },
];
