import * as service from '../../services/reason-codes.service';

// Keep business logic OUT of resolvers.

export default {
  Query: {
    reasonCodesList: (_: unknown, args: Record<string, any>, ctx: unknown) => service.list(args, ctx),
  },
  Mutation: {},
};
