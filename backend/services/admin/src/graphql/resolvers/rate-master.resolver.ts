import * as service from '../../services/rate-master.service';

// Keep business logic OUT of resolvers.

export default {
  Query: {
    rateMasterList: (_: unknown, args: Record<string, any>, ctx: unknown) => service.list(args, ctx),
  },
  Mutation: {},
};
