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

// Real backend query: the backend's `menus.typeDefs.ts` is still a stub —
// `type Menus { id: Int! }` with a bare `menusList` query — so `id` is the
// only field that actually exists server-side today.
export const GET_MENUS = gql`
  query GetMenus {
    menusList {
      id
    }
  }
`;

// NOTE: The backend has no create/update/delete mutations for menus at all
// (menus resolvers export an empty `Mutation: {}`) — these don't correspond
// to any real backend operation and are never sent (see useMenuMutations.ts,
// which is wired to no-ops). Left here as dead code, using the full field
// set the UI will eventually need, for whenever the backend implements menu
// mutations.
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
