import * as service from '../../services/opportunity.service';

// Keep business logic OUT of resolvers.

export default {
  Query: {
    opportunityList: (_: unknown, args: Record<string, any>, ctx: unknown) => service.list(args, ctx),
  },
  Mutation: {},
};
