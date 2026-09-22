import { gql } from "@apollo/client";

// Fields match the real backend's Permission type (permissions.typeDefs.ts)
// exactly. This mirrors permission-management's PERMISSION_FIELDS fragment
// but is kept local so this feature's queries are self-contained.
const MENU_PERMISSION_FIELDS = gql`
  fragment MenuPermissionMappingPermissionFields on Permission {
    permissionId
    permissionName
    permissionKey
    description
    isActive
  }
`;

// Purpose-built lightweight query for the menu selector on this page — use
// this instead of the heavier menu-management `menus` query.
export const GET_MENUS_FOR_MAPPING = gql`
  query GetMenusForMapping {
    menusForPermissionMapping {
      menuId
      menuName
    }
  }
`;

// The permissions currently mapped to a menu — used only to determine which
// checkboxes start pre-checked in the full catalog rendered from
// GET_PERMISSIONS (permission-management/permission.queries.ts).
export const GET_MENU_PERMISSIONS = gql`
  query GetMenuPermissions($menuId: Int!) {
    menuPermissions(menuId: $menuId) {
      ...MenuPermissionMappingPermissionFields
    }
  }
  ${MENU_PERMISSION_FIELDS}
`;

// Full-replace operation — permissionIds is the COMPLETE desired set for the
// menu, not a delta. Unlike role-menu-permission-assignment's add/remove
// mutations, there is a single save here.
export const SAVE_MENU_PERMISSIONS = gql`
  mutation SaveMenuPermissions($input: MenuPermissionMappingInput!) {
    saveMenuPermissions(input: $input) {
      ...MenuPermissionMappingPermissionFields
    }
  }
  ${MENU_PERMISSION_FIELDS}
`;

// Every mapping across every menu, names already joined in — powers the
// overview list so additions are visible without picking each menu one by
// one from the selector above.
export const GET_ALL_MENU_PERMISSION_MAPPINGS = gql`
  query GetAllMenuPermissionMappings {
    menuPermissionMappings {
      id
      menuId
      permissionId
      menuName
      permissionName
      permissionKey
    }
  }
`;
