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
