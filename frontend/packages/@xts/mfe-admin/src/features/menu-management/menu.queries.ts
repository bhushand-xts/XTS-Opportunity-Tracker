import { gql } from "@apollo/client";

const MENU_FIELDS = gql`
  fragment MenuFields on Menu {
    id
    menuName
    menuType
    parentMenuId
    icon
    displayOrder
    menuKey
    isActive
  }
`;

export const GET_MENUS = gql`
  query GetMenus {
    menus {
      ...MenuFields
    }
  }
  ${MENU_FIELDS}
`;

export const CREATE_MENU = gql`
  mutation CreateMenu($input: MenuInput!) {
    createMenu(input: $input) {
      ...MenuFields
    }
  }
  ${MENU_FIELDS}
`;

export const UPDATE_MENU = gql`
  mutation UpdateMenu($id: ID!, $input: MenuInput!) {
    updateMenu(id: $id, input: $input) {
      ...MenuFields
    }
  }
  ${MENU_FIELDS}
`;
