// The route contract: every mfe-*/src/routes.ts exports RouteManifest[],
// which the shell composes into its top-level router at startup. The
// shell never hardcodes a domain's internal paths -- it only knows the
// top-level prefix (see routes.registry.ts) and the manifest each remote
// hands it.

import type { ComponentType } from "react";

export interface RouteManifest {
  path: string;
  component: ComponentType;
  requiredPermission: string;
  navLabel?: string;
}
