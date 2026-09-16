import type { RouteManifest } from "@xts/platform";
import { RfpListPage } from "./pages/RfpListPage";
import { RfpDetailPage } from "./pages/RfpDetailPage";

export const routes: RouteManifest[] = [
  { path: "/", component: RfpListPage, requiredPermission: "rfp:view", navLabel: "RFP Intake & Response" },
  { path: "/:id", component: RfpDetailPage, requiredPermission: "rfp:view" },
];
