export default `
  type ReasonCodes {
    id: Int!
  }

  extend type Query {
    reasonCodesList: [ReasonCodes]
  }
`;
