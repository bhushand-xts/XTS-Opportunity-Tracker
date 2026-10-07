import { gql } from "@apollo/client";

// Trimmed selections of the same `menus`/`roleAccess` queries the admin
// MFE's Menu Master and Role Menu Permission Assignment screens already use
// successfully (see mfe-admin's menu.queries.ts and
// role-menu-permission-assignment/useRoleMenuPermissions.ts) — no new
// backend work, just reading the existing data from elsewhere.

export const GET_MENUS_FOR_ACCESS = gql`
  query GetMenusForAccess {
    menus {
      menuId
      menuKey
    }
  }
`;

export const GET_ROLE_ACCESS = gql`
  query GetRoleAccessForMenuGate($roleId: Int!) {
    roleAccess(roleId: $roleId) {
      menuId
      permissionKey
    }
  }
`;
