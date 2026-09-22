import { gql } from "@apollo/client";

/** Every "this permission is allowed on this menu" link, for all menus. */
export const GET_MENU_PERMISSION_MAPPINGS = gql`
  query GetMenuPermissionMappings {
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

/** The permissions currently mapped to one menu. */
export const GET_MENU_PERMISSIONS = gql`
  query GetMenuPermissions($menuId: Int!) {
    menuPermissions(menuId: $menuId) {
      permissionId
      isActive
    }
  }
`;

/** Replaces a menu's permission set with exactly the ids given. */
export const SAVE_MENU_PERMISSIONS = gql`
  mutation SaveMenuPermissions($input: MenuPermissionMappingInput!) {
    saveMenuPermissions(input: $input) {
      permissionId
    }
  }
`;
