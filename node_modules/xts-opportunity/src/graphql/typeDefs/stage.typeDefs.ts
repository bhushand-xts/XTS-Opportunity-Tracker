export default `
  type Stage {
    id: Int!
  }

  extend type Query {
    stageList: [Stage]
  }
`;
