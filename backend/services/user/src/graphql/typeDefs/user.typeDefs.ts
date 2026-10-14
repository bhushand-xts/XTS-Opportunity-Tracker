export default `
  type User {
    id: Int!
    firstName: String
    lastName: String
    email: String!
    # The one role assigned to the user (an admin service role id), or null.
    roleId: Int
    isActive: Boolean
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  extend type Query {
    # Every user, with their assigned role.
    userList: [User]
    usersByRoleCount(roleId: Int!): Int!
    # The id of the user the request's login token (Authorization: Bearer ...)
    # belongs to, or null if there is no token or it is not valid. The gateway
    # calls this on every request to learn who is signed in.
    currentUserId: Int
  }

  extend type Mutation {
    register(firstName: String!, lastName: String!, email: String!, password: String!): AuthPayload!
    login(email: String!, password: String!): AuthPayload!
    # Gives the user one role (roleId), or removes it (roleId null). The role must
    # exist and be active. The change is recorded against the signed-in user.
    assignUserRole(userId: Int!, roleId: Int, updatedBy: Int): User!
    # Changes the signed-in user's own password. Always targets the caller —
    # there is no userId argument, so nobody can change someone else's password.
    changePassword(currentPassword: String!, newPassword: String!): Boolean!
    # Emails a reset link if the address has an account. Always returns true —
    # the response never reveals whether the email exists.
    requestPasswordReset(email: String!): Boolean!
    # Completes a reset using the token from the emailed link.
    resetPassword(token: String!, newPassword: String!): Boolean!
  }
`;
