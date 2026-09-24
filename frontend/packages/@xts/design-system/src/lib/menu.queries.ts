import { gql } from "@apollo/client";

// Same field set as mfe-admin's GET_MENUS (menu-management/menu.queries.ts) —
// kept separate rather than shared because the two packages don't share a
// GraphQL-document module today, and this query has no mutations alongside it.
export const MENUS = gql`
  query SidebarMenus {
    menus {
      menuId
      menuName
      menuKey
      icon
      parentId
      sortOrder
      isActive
    }
  }
`;

// Mirrors accessResolvers.Query.roleAccess (backend/services/admin/.../access.resolver.ts).
export const ROLE_ACCESS = gql`
  query SidebarRoleAccess($roleId: Int!) {
    roleAccess(roleId: $roleId) {
      menuId
      permissionId
      permissionKey
    }
  }
`;
