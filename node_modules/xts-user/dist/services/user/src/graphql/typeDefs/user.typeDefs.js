"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = `
  type User {
    id: Int!
  }

  extend type Query {
    userList: [User]
    usersByRoleCount(roleId: Int!): Int!
  }
`;
//# sourceMappingURL=user.typeDefs.js.map