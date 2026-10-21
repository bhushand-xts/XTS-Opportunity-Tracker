export default `
  type ProposalSections {
    id: Int!
  }

  extend type Query {
    proposalSectionsList: [ProposalSections]
  }
`;
