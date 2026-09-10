import type { PermissionMap } from "@xts/platform";

export const permissions: PermissionMap = {
  "rfp:view": [
    "sales_executive",
    "sales_manager",
    "sales_head",
    "management",
    "administrator",
  ],
  "rfp:edit": ["sales_executive", "sales_manager"],
  "rfp:approve": ["sales_manager", "sales_head"],
};
