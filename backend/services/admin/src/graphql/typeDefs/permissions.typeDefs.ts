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

  input CreatePermissionInput {
    permissionName: String!
    permissionKey: String!
    description: String
    createdBy: Int!
  }

  input UpdatePermissionInput {
    permissionName: String
    permissionKey: String
    description: String
    isActive: Boolean
    updatedBy: Int!
  }

  extend type Query {
    permissions(
      isActive: Boolean
    ): [Permission!]!

    permission(
      permissionId: Int!
    ): Permission
  }

  extend type Mutation {

    createPermission(
      input: CreatePermissionInput!
    ): Permission!

    updatePermission(
      permissionId: Int!
      input: UpdatePermissionInput!
    ): Permission!

    deletePermission(
      permissionId: Int!
      updatedBy: Int!
    ): Permission!
  }
`;