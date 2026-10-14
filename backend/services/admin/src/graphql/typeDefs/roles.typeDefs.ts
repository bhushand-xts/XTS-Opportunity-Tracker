export default `
  type Role {
    id: Int!
    roleName: String!
    roleCode: String
    description: String
    isActive: Boolean!
    createdDt: String
    createdBy: Int
    updatedDt: String
    updatedBy: Int
  }

  # One entry of a role's change history (mst_roles_tracker), newest first.
  type RoleHistory {
    trackerId: Int!
    roleId: Int!
    roleName: String!
    roleCode: String
    description: String
    isActive: Boolean!
    createdDt: String
    createdBy: Int
    updatedDt: String
    updatedBy: Int
  }

  input CreateRoleInput {
    roleName: String!
    roleCode: String
    description: String
    isActive: Boolean
    createdBy: Int
  }

  input UpdateRoleInput {
    roleName: String
    roleCode: String
    description: String
    isActive: Boolean
    updatedBy: Int
  }

  extend type Query {
    rolesList: [Role]
    role(id: Int!): Role
    roleHistory(roleId: Int!): [RoleHistory!]!
  }

  extend type Mutation {
    createRole(input: CreateRoleInput!): Role
    updateRole(id: Int!, input: UpdateRoleInput!): Role
    deleteRole(id: Int!, updatedBy: Int): Boolean
  }
`;
