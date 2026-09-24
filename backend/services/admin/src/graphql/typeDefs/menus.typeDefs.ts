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
   type SidebarMenu {
    menuId: Int!
    menuName: String!
    menuKey: String!
    icon: String
    parentId: Int
    sortOrder: Int!
    children: [SidebarMenu!]!
  }
  type UserMenus {
    menuId: Int!
    menuName: String!
    menuKey: String!
    parentId: Int
    children: [UserMenus!]!
  }

  type UserMenuPermissionsByMenu  {
    permissionId: Int!
    permissionName: String!
    permissionKey: String!
  }
  input CreateMenuInput {
    menuName: String!
    menuKey: String!
    icon: String
    parentId: Int
    sortOrder: Int!
    createdBy: Int
  }

  input UpdateMenuInput {
    menuName: String
    menuKey: String
    icon: String
    parentId: Int
    sortOrder: Int
    updatedBy: Int
  }

  extend type Query {
    menus(asTree: Boolean = false): [Menu!]!

    menu(menuId: Int!): Menu
     mySidebar: [SidebarMenu!]!
    userMenus: [UserMenus!]!
    userMenuPermissionsByMenu(menuId: Int!): [UserMenuPermissionsByMenu!]!
  }

  extend type Mutation {
    createMenu(input: CreateMenuInput!): Menu!

    updateMenu(
      menuId: Int!
      input: UpdateMenuInput!
    ): Menu!

    toggleMenuStatus(
      menuId: Int!
      isActive: Boolean!
      updatedBy: Int
    ): Menu!
  }
`;
export default menuTypeDefs;