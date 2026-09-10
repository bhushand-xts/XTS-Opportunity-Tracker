export default `
  type Phases {
    id: Int!
  }

  extend type Query {
    phasesList: [Phases]
  }
`;
