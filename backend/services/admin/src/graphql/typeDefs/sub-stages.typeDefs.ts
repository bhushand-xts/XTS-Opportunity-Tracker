export default `
  type SubStages {
    id: Int!
  }

  extend type Query {
    subStagesList: [SubStages]
  }
`;
