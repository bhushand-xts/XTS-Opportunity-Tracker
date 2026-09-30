export const permissionTypeDefs = `#graphql

  type Permission {
    permissionId: Int!
    permissionName: String!
    permissionKey: String!
    description: String
    createdDt: String!
    createdBy: Int!
    updatedDt: String
    updatedBy: Int
    isActive: Boolean!
  }

  # One entry of a permission's change history (mst_permissions_tracker), newest first.
  type PermissionHistory {
    trackerId: Int!
    permissionId: Int!
    permissionName: String!
    permissionKey: String!
    description: String
    isActive: Boolean!
    createdDt: String!
    createdBy: Int
    updatedDt: String
    updatedBy: Int
  }

  type MenuForPermissionMapping {
    menuId: Int!
    menuName: String!
  }

  type MenuPermissionMapping {
    id: Int!
    menuId: Int!
    permissionId: Int!
    menuName: String!
    permissionName: String!
    permissionKey: String!
    createdDt: String!
    createdBy: Int!
    updatedDt: String
    updatedBy: Int
  }

  input CreatePermissionInput {
    permissionName: String!
    permissionKey: String!
    description: String
    createdBy: Int
  }

  input UpdatePermissionInput {
    permissionName: String
    permissionKey: String
    description: String
    updatedBy: Int
  }

  input MenuPermissionMappingInput {
    menuId: Int!
    permissionIds: [Int!]!
    updatedBy: Int
  }

  extend type Query {

    permissions: [Permission!]!

    permission(
      permissionId: Int!
    ): Permission

    permissionHistory(
      permissionId: Int!
    ): [PermissionHistory!]!

    menusForPermissionMapping:
      [MenuForPermissionMapping!]!

    menuPermissions(
      menuId: Int!
    ): [Permission!]!

    menuPermissionMappings:
      [MenuPermissionMapping!]!
  }

  extend type Mutation {

    createPermission(
      input: CreatePermissionInput!
    ): Permission!

    updatePermission(
      permissionId: Int!
      input: UpdatePermissionInput!
    ): Permission!

    togglePermissionStatus(
      permissionId: Int!
      isActive: Boolean!
      updatedBy: Int
    ): Permission!

    saveMenuPermissions(
      input: MenuPermissionMappingInput!
    ): [Permission!]!
  }
`;

export default permissionTypeDefs;