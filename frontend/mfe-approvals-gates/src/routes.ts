import type { RouteManifest } from "@xts/platform";
import { ApprovalQueuePage } from "./pages/ApprovalQueuePage";
import { ApprovalDetailPage } from "./pages/ApprovalDetailPage";

export const routes: RouteManifest[] = [
  { path: "/", component: ApprovalQueuePage, requiredPermission: "approval:view", navLabel: "Approvals & Gates" },
  { path: "/:id", component: ApprovalDetailPage, requiredPermission: "approval:view" },
];
