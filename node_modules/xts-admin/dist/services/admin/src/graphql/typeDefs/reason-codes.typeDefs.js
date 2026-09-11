"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = `
  type ReasonCodes {
    id: Int!
  }

  extend type Query {
    reasonCodesList: [ReasonCodes]
  }
`;
//# sourceMappingURL=reason-codes.typeDefs.js.map