import type { PermissionMap } from "@xts/platform";

export const permissions: PermissionMap = {
  "opportunity:view": [
    "sales_executive",
    "sales_manager",
    "sales_head",
    "management",
    "administrator",
  ],
  "opportunity:edit": ["sales_executive", "sales_manager"],
  "opportunity:approve": ["sales_manager", "sales_head"],
};
