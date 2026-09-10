import type { PermissionMap } from "@xts/platform";

export const permissions: PermissionMap = {
  "estimation:view": [
    "sales_executive",
    "sales_manager",
    "sales_head",
    "management",
    "administrator",
  ],
  "estimation:edit": ["sales_executive", "sales_manager"],
  "estimation:approve": ["sales_manager", "sales_head"],
};
