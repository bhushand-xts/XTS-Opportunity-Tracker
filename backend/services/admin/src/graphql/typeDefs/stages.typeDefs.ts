export default `
  type Stages {
    id: Int!
  }

  extend type Query {
    stagesList: [Stages]
  }
`;
