"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = `
  type Stages {
    id: Int!
  }

  extend type Query {
    stagesList: [Stages]
  }
`;
//# sourceMappingURL=stages.typeDefs.js.map