import * as service from '../../services/stages.service';

export default {
  Stage: {
    inUse: (parent: { id: number }) => service.inUse(parent.id),
  },
  Query: {
    stagesList: (_: unknown, args: Record<string, any>, ctx: unknown) => service.list(),
    stage: (_: unknown, args: { id: number }) => service.get(args.id),
    stageHistory: (_: unknown, args: { stageId: number }) => service.history(args.stageId),
  },
  Mutation: {
    createStage: (_: unknown, args: { input: any }, ctx: unknown) => service.create(args.input, ctx),
    updateStage: (_: unknown, args: { id: number; input: any }, ctx: unknown) =>
      service.update(args.id, args.input, ctx),
  },
};
