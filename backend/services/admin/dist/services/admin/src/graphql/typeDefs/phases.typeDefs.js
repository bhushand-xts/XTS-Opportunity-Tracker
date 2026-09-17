"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = `
  type Phases {
    id: Int!
  }

  extend type Query {
    phasesList: [Phases]
  }
`;
//# sourceMappingURL=phases.typeDefs.js.map