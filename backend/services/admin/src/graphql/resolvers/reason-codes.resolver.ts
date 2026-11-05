import * as service from '../../services/reason-codes.service';

// Keep business logic OUT of resolvers.

export default {
  Query: {
    reasonCodesList: (_: unknown, args: Record<string, any>, ctx: unknown) => service.list(args, ctx),
    reasonCode: (_: unknown, args: { id: number }) => service.get(args.id),
    reasonCodeHistory: (_: unknown, args: { reasonCodeId: number }) => service.history(args.reasonCodeId),
  },
  Mutation: {
    createReasonCode: (_: unknown, args: { input: any }, ctx: unknown) => service.create(args.input, ctx),
    updateReasonCode: (_: unknown, args: { id: number; input: any }, ctx: unknown) =>
      service.update(args.id, args.input, ctx),
    deleteReasonCode: (_: unknown, args: { id: number; updatedBy?: number }, ctx: any) =>
      service.remove(args.id, ctx?.user?.id ?? args.updatedBy ?? null),
  },
};
