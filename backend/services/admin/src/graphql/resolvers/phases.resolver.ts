import * as service from '../../services/phases.service';

// Keep business logic OUT of resolvers.

export default {
  Query: {
    phasesList: (_: unknown, args: Record<string, any>, ctx: unknown) => service.list(args, ctx),
  },
  Mutation: {},
};
