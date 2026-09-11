"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = `
  type Role {
    id: Int!
    roleName: String!
    roleCode: String
    description: String
    isActive: Boolean!
    createdDt: String
    updatedDt: String
  }

  input CreateRoleInput {
    roleName: String!
    roleCode: String
    description: String
    isActive: Boolean
  }

  input UpdateRoleInput {
    roleName: String
    roleCode: String
    description: String
    isActive: Boolean
  }

  extend type Query {
    rolesList: [Role]
    role(id: Int!): Role
  }

  extend type Mutation {
    createRole(input: CreateRoleInput!): Role
    updateRole(id: Int!, input: UpdateRoleInput!): Role
    deleteRole(id: Int!): Boolean
  }
`;
//# sourceMappingURL=roles.typeDefs.js.map