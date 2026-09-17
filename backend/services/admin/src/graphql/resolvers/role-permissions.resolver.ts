import * as service from '../../services/role-permissions.service';

// Keep business logic OUT of resolvers.

export default {
  Query: {
    rolePermissionsList: (_: unknown, args: Record<string, any>, ctx: unknown) => service.list(args, ctx),
  },
  Mutation: {},
};
