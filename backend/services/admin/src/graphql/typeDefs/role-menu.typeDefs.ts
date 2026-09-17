export default `
  type RoleMenu {
    id: Int!
  }

  extend type Query {
    roleMenuList: [RoleMenu]
  }
`;
