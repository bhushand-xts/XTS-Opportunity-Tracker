import * as service from '../../services/user.service';

// Keep business logic OUT of resolvers.

export default {
  Query: {
    userList: (_: unknown, args: Record<string, any>, ctx: unknown) => service.list(args, ctx),
  },
  Mutation: {},
};
