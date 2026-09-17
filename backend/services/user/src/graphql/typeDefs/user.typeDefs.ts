export default `
  type User {
    id: Int!
    firstName: String
    lastName: String
    email: String!
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  extend type Query {
    userList: [User]
    usersByRoleCount(roleId: Int!): Int!
  }

  extend type Mutation {
    register(firstName: String!, lastName: String!, email: String!, password: String!): AuthPayload!
    login(email: String!, password: String!): AuthPayload!
  }
`;
