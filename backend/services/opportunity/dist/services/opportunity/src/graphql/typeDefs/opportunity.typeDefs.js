"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = `
  type Opportunity {
    id: Int!
  }

  extend type Query {
    opportunityList: [Opportunity]
  }
`;
//# sourceMappingURL=opportunity.typeDefs.js.map