import * as service from '../../services/stage.service';

// Keep business logic OUT of resolvers.

export default {
  Query: {
    stageList: (_: unknown, args: Record<string, any>, ctx: unknown) => service.list(args, ctx),
  },
  Mutation: {},
};
