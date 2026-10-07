import * as service from '../../services/sub-stages.service';

export default {
  SubStage: {
    inUse: (parent: { id: number }) => service.inUse(parent.id),
  },
  Query: {
    subStagesList: (_: unknown, args: Record<string, any>, ctx: unknown) => service.list(),
    subStage: (_: unknown, args: { id: number }) => service.get(args.id),
    subStageHistory: (_: unknown, args: { subStageId: number }) => service.history(args.subStageId),
  },
  Mutation: {
    createSubStage: (_: unknown, args: { input: any }, ctx: unknown) => service.create(args.input, ctx),
    updateSubStage: (_: unknown, args: { id: number; input: any }, ctx: unknown) =>
      service.update(args.id, args.input, ctx),
  },
};
