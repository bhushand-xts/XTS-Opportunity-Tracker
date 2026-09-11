export default `
  type Permissions {
    id: Int!
  }

  extend type Query {
    permissionsList: [Permissions]
  }
`;
