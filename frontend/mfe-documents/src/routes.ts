import type { RouteManifest } from "@xts/platform";
import { DocumentLibraryPage } from "./pages/DocumentLibraryPage";
import { DocumentDetailPage } from "./pages/DocumentDetailPage";

export const routes: RouteManifest[] = [
  { path: "/", component: DocumentLibraryPage, requiredPermission: "document:view", navLabel: "Documents & Attachments" },
  { path: "/:id", component: DocumentDetailPage, requiredPermission: "document:view" },
];
