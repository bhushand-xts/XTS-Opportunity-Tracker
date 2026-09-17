"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = `
  type Permissions {
    id: Int!
  }

  extend type Query {
    permissionsList: [Permissions]
  }
`;
//# sourceMappingURL=permissions.typeDefs.js.map