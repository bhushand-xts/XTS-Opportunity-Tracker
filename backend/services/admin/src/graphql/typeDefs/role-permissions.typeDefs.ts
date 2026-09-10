export default `
  type RolePermissions {
    id: Int!
  }

  extend type Query {
    rolePermissionsList: [RolePermissions]
  }
`;
