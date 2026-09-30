import * as service from '../../services/rfp-questions.service';

// Keep business logic OUT of resolvers.

export default {
  Query: {
    rfpQuestionsList: (_: unknown, args: Record<string, any>, ctx: unknown) => service.list(args, ctx),
    rfpQuestion: (_: unknown, args: { id: number }) => service.get(args.id),
    rfpQuestionHistory: (_: unknown, args: { questionId: number }) => service.history(args.questionId),
  },
  Mutation: {
    createRfpQuestion: (_: unknown, args: { input: any }, ctx: unknown) => service.create(args.input, ctx),
    updateRfpQuestion: (_: unknown, args: { id: number; input: any }, ctx: unknown) =>
      service.update(args.id, args.input, ctx),
  },
};
