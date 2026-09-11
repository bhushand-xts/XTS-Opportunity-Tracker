import * as service from '../../services/roles.service';

// Keep business logic OUT of resolvers.

export default {
  Query: {
    rolesList: (_: unknown, args: Record<string, any>, ctx: unknown) => service.list(args, ctx),
    role: (_: unknown, args: { id: number }) => service.get(args.id),
  },
  Mutation: {
    createRole: (_: unknown, args: { input: any }, ctx: unknown) => service.create(args.input, ctx),
    updateRole: (_: unknown, args: { id: number; input: any }, ctx: unknown) =>
      service.update(args.id, args.input, ctx),
    deleteRole: (_: unknown, args: { id: number }) => service.remove(args.id),
  },
};
