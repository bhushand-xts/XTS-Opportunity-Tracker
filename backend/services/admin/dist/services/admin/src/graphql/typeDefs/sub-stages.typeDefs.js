"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = `
  type SubStages {
    id: Int!
  }

  extend type Query {
    subStagesList: [SubStages]
  }
`;
//# sourceMappingURL=sub-stages.typeDefs.js.map