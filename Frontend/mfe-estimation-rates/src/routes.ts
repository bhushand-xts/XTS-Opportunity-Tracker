import type { RouteManifest } from "@xts/platform";
import { EstimationListPage } from "./pages/EstimationListPage";
import { EstimationDetailPage } from "./pages/EstimationDetailPage";

export const routes: RouteManifest[] = [
  { path: "/", component: EstimationListPage, requiredPermission: "estimation:view", navLabel: "Estimation & Rate Master" },
  { path: "/:id", component: EstimationDetailPage, requiredPermission: "estimation:view" },
];
