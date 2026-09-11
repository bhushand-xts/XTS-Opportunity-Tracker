export default `
  type Menus {
    id: Int!
  }

  extend type Query {
    menusList: [Menus]
  }
`;
