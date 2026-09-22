import * as service from '../../services/sub-stages.service';

// Keep business logic OUT of resolvers.

export default {
  Query: {
    subStagesList: (_: unknown, args: Record<string, any>, ctx: unknown) => service.list(args, ctx),
  },
  Mutation: {},
};
