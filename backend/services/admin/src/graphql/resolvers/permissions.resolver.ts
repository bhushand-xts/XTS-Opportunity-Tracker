import * as service from '../../services/permissions.service';

// Keep business logic OUT of resolvers.

export default {
  Query: {
    permissionsList: (_: unknown, args: Record<string, any>, ctx: unknown) => service.list(args, ctx),
  },
  Mutation: {},
};
