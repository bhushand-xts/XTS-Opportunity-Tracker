import * as service from '../../services/stages.service';

// Keep business logic OUT of resolvers.

export default {
  Query: {
    stagesList: (_: unknown, args: Record<string, any>, ctx: unknown) => service.list(args, ctx),
  },
  Mutation: {},
};
