import * as service from '../../services/roles.service';

// Keep business logic OUT of resolvers.

export default {
  Query: {
    rolesList: (_: unknown, args: Record<string, any>, ctx: unknown) => service.list(args, ctx),
  },
  Mutation: {},
};
