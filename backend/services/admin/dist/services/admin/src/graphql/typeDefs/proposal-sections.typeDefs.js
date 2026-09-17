"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = `
  type ProposalSections {
    id: Int!
  }

  extend type Query {
    proposalSectionsList: [ProposalSections]
  }
`;
//# sourceMappingURL=proposal-sections.typeDefs.js.map