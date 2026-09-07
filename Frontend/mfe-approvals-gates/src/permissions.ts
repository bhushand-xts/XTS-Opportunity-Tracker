import type { PermissionMap } from "@xts/platform";

export const permissions: PermissionMap = {
  "approval:view": [
    "sales_executive",
    "sales_manager",
    "sales_head",
    "management",
    "administrator",
  ],
  "approval:edit": ["sales_executive", "sales_manager"],
  "approval:approve": ["sales_manager", "sales_head"],
};
