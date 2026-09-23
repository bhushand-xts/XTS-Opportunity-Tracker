export default `
  type Opportunity {
    id: Int!
  }

  extend type Query {
    opportunityList: [Opportunity]
  }
`;
