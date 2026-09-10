export const menuTypeDefs = `#graphql

  type Menu {
    menuId: Int!
    menuName: String!
    menuKey: String!
    icon: String
    parentId: Int
    sortOrder: Int!
    createdDt: String!
    createdBy: Int!
    updatedDt: String
    updatedBy: Int
    isActive: Boolean!
    children: [Menu!]!
  }

  input CreateMenuInput {
    menuName: String!
    menuKey: String!
    icon: String
    parentId: Int
    sortOrder: Int!
    createdBy: Int!
  }

  input UpdateMenuInput {
    menuName: String
    menuKey: String
    icon: String
    parentId: Int
    sortOrder: Int
    isActive: Boolean
    updatedBy: Int!
  }

  extend type Query {
    menus(
      isActive: Boolean
      asTree: Boolean = false
    ): [Menu!]!

    menu(
      menuId: Int!
    ): Menu
  }

  extend type Mutation {

    createMenu(
      input: CreateMenuInput!
    ): Menu!

    updateMenu(
      menuId: Int!
      input: UpdateMenuInput!
    ): Menu!

  }
`;