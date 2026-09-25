import { gql } from "@apollo/client";

// Mirrors menuResolvers.Query.mySidebar (backend/services/admin/.../menus.resolver.ts) —
// the signed-in user's own menu tree, already pruned to what their current
// role holds (plus structural ancestors) and already nested, resolved
// server-side from the auth token rather than a client-supplied roleId.
//
// GraphQL has no way to select a recursive type at unbounded depth, so
// `children` is spelled out by hand a few levels down — deep enough for any
// realistic menu tree (today's is 3 levels), not a hard limit anyone is
// expected to hit.
const SIDEBAR_MENU_FIELDS = `
  menuId
  menuName
  menuKey
  icon
`;

export const MY_SIDEBAR = gql`
  query MySidebar {
    mySidebar {
      ${SIDEBAR_MENU_FIELDS}
      children {
        ${SIDEBAR_MENU_FIELDS}
        children {
          ${SIDEBAR_MENU_FIELDS}
          children {
            ${SIDEBAR_MENU_FIELDS}
            children {
              ${SIDEBAR_MENU_FIELDS}
              children {
                ${SIDEBAR_MENU_FIELDS}
              }
            }
          }
        }
      }
    }
  }
`;

// Mirrors menuResolvers.Query.userMenuPermissionsByMenu — which specific
// actions (view/edit/delete/...) the signed-in user holds on one menu.
// Menu-level access (mySidebar) only answers "can I see this page at all";
// this answers "which of its buttons should actually work."
export const USER_MENU_PERMISSIONS_BY_MENU = gql`
  query UserMenuPermissionsByMenu($menuId: Int!) {
    userMenuPermissionsByMenu(menuId: $menuId) {
      permissionKey
    }
  }
`;
