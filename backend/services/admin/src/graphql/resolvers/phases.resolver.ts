import * as service from '../../services/phases.service';

// Keep business logic OUT of resolvers.

export default {
  Query: {
    estimationPhasesList: (_: unknown, args: Record<string, any>, ctx: unknown) => service.list(args, ctx),
    estimationPhase: (_: unknown, args: { id: number }) => service.get(args.id),
    estimationPhaseHistory: (_: unknown, args: { phaseId: number }) => service.history(args.phaseId),
  },
  Mutation: {
    createEstimationPhase: (_: unknown, args: { input: any }, ctx: unknown) => service.create(args.input, ctx),
    updateEstimationPhase: (_: unknown, args: { id: number; input: any }, ctx: unknown) =>
      service.update(args.id, args.input, ctx),
    deleteEstimationPhase: (_: unknown, args: { id: number; updatedBy?: number }, ctx: any) =>
      service.remove(args.id, ctx?.user?.id ?? args.updatedBy ?? null),
  },
};
