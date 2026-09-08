import type { PermissionMap } from "@xts/platform";

export const permissions: PermissionMap = {
  "document:view": [
    "sales_executive",
    "sales_manager",
    "sales_head",
    "management",
    "administrator",
  ],
  "document:edit": ["sales_executive", "sales_manager"],
  "document:approve": ["sales_manager", "sales_head"],
};
