export default `
  type User {
    id: Int!
  }

  extend type Query {
    userList: [User]
  }
`;
