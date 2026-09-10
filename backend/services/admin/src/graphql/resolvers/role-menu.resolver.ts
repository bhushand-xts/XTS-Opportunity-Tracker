import * as service from '../../services/role-menu.service';

// Keep business logic OUT of resolvers.

export default {
  Query: {
    roleMenuList: (_: unknown, args: Record<string, any>, ctx: unknown) => service.list(args, ctx),
  },
  Mutation: {},
};
