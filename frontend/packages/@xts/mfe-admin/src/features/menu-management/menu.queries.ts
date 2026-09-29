import { gql } from "@apollo/client";

const MENU_FIELDS = gql`
  fragment MenuFields on Menu {
    menuId
    menuName
    menuKey
    icon
    parentId
    sortOrder
    routePath
    isActive
    createdDt
    createdBy
    updatedDt
    updatedBy
  }
`;

// Flat list — the page builds the parent/child order itself.
// (`children` is only populated by `menus(asTree: true)`, so it is not selected here.)
export const GET_MENUS = gql`
  query GetMenus {
    menus {
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

export const TOGGLE_MENU_STATUS = gql`
  mutation ToggleMenuStatus($menuId: Int!, $isActive: Boolean!, $updatedBy: Int!) {
    toggleMenuStatus(menuId: $menuId, isActive: $isActive, updatedBy: $updatedBy) {
      ...MenuFields
    }
  }
  ${MENU_FIELDS}
`;
