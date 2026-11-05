import { gql } from "@apollo/client";

// Backs the sidebar's temporary "Dynamic Nav (Preview)" section (see
// AppShell.tsx) — the menu tree built straight from mst_menus, for verifying
// against the hand-written static ADMIN_NAV before it gets removed.
// Three levels deep (top menu -> group -> leaf) covers today's nav depth;
// anything deeper simply won't show in the preview.
const NAV_MENU_FIELDS = `
  menuId
  menuName
  menuKey
  icon
  parentId
  sortOrder
  routePath
  isActive
`;

export const GET_NAV_MENUS = gql`
  query GetNavMenus {
    menus(asTree: true) {
      ${NAV_MENU_FIELDS}
      children {
        ${NAV_MENU_FIELDS}
        children {
          ${NAV_MENU_FIELDS}
        }
      }
    }
  }
`;

// MFE navigation is bound to the existing Menu Master record, rather than a
// separate static label or module-level permission.
export const GET_MFE_MENU = gql`
  query GetMfeMenu($menuId: Int!) {
    menu(menuId: $menuId) {
      ${NAV_MENU_FIELDS}
    }
  }
`;
