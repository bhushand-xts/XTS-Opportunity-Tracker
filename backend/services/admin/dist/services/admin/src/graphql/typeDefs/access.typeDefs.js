"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.accessTypeDefs = void 0;
exports.accessTypeDefs = `#graphql

  type RoleMenuPermission {
    id: Int!
    roleId: Int!
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

  type AvailablePermission {
    permissionId: Int!
    permissionName: String!
    permissionKey: String!
  }

  input RoleMenuPermissionInput {
    roleId: Int!
    menuId: Int!
    permissionIds: [Int!]!
    updatedBy: Int!
  }

  extend type Query {
    roleAccess(roleId: Int!): [RoleMenuPermission!]!
    roleMenuPermissions(roleId: Int!, menuId: Int!): [RoleMenuPermission!]!
    availablePermissionsForMenu(menuId: Int!): [AvailablePermission!]!
  }

  extend type Mutation {
    addRoleMenuPermissions(input: RoleMenuPermissionInput!): [RoleMenuPermission!]!
    removeRoleMenuPermissions(input: RoleMenuPermissionInput!): [RoleMenuPermission!]!
  }
`;
exports.default = exports.accessTypeDefs;
//# sourceMappingURL=access.typeDefs.js.map