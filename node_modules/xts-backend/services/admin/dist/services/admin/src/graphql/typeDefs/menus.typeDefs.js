"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = `
  type Menus {
    id: Int!
  }

  extend type Query {
    menusList: [Menus]
  }
`;
//# sourceMappingURL=menus.typeDefs.js.map