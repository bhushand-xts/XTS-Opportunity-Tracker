"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = `
  type RolePermissions {
    id: Int!
  }

  extend type Query {
    rolePermissionsList: [RolePermissions]
  }
`;
//# sourceMappingURL=role-permissions.typeDefs.js.map