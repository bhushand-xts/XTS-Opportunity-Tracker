export default `
  type RateMaster {
    id: Int!
  }

  extend type Query {
    rateMasterList: [RateMaster]
  }
`;
