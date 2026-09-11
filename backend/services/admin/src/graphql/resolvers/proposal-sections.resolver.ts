import * as service from '../../services/proposal-sections.service';

// Keep business logic OUT of resolvers.

export default {
  Query: {
    proposalSectionsList: (_: unknown, args: Record<string, any>, ctx: unknown) => service.list(args, ctx),
  },
  Mutation: {},
};
