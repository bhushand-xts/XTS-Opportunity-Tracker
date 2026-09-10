export default `
  type Roles {
    id: Int!
  }

  extend type Query {
    rolesList: [Roles]
  }
`;
