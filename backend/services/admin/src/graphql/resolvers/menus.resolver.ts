import * as service from '../../services/menus.service';

// Keep business logic OUT of resolvers.

export default {
  Query: {
    menusList: (_: unknown, args: Record<string, any>, ctx: unknown) => service.list(args, ctx),
  },
  Mutation: {},
};
