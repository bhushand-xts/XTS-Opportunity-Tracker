import { gql } from "@apollo/client";

// Fields match the real backend's Menu type (menus.typeDefs.ts) exactly.
// `children` deliberately isn't queried here — it's a recursive field that
// would let a query request unbounded depth; menus are always fetched flat
// (asTree: false) and rendered as a flat table, same as Role Master.
const MENU_FIELDS = gql`
  fragment MenuFields on Menu {
    menuId
    menuName
    menuKey
    icon
    parentId
    sortOrder
    createdDt
    createdBy
    updatedDt
    updatedBy
    isActive
  }
`;

export const GET_MENUS = gql`
  query GetMenus {
    menus(asTree: false) {
      ...MenuFields
    }
  }
  ${MENU_FIELDS}
`;

export const CREATE_MENU = gql`
  mutation CreateMenu($input: CreateMenuInput!) {
    createMenu(input: $input) {
      ...MenuFields
    }
  }
  ${MENU_FIELDS}
`;

export const UPDATE_MENU = gql`
  mutation UpdateMenu($menuId: Int!, $input: UpdateMenuInput!) {
    updateMenu(menuId: $menuId, input: $input) {
      ...MenuFields
    }
  }
  ${MENU_FIELDS}
`;

// There is no delete mutation for menus — only a soft toggle of isActive.
export const TOGGLE_MENU_STATUS = gql`
  mutation ToggleMenuStatus($menuId: Int!, $isActive: Boolean!, $updatedBy: Int!) {
    toggleMenuStatus(menuId: $menuId, isActive: $isActive, updatedBy: $updatedBy) {
      ...MenuFields
    }
  }
  ${MENU_FIELDS}
`;
