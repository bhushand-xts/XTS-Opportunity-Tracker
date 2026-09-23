import * as service from '../../services/user.service';
import * as authService from '../../services/auth.service';

// Keep business logic OUT of resolvers.

export default {
  Query: {
    userList: (_: unknown, args: Record<string, any>, ctx: unknown) => service.list(args, ctx),
    usersByRoleCount: (_: unknown, args: { roleId: number }) => service.countByRole(args.roleId),
    currentUserId: async (_: unknown, __: unknown, ctx: { token?: string; verifiedUserId?: number }) =>
      (await authService.userIdFromToken(ctx.token)) ?? ctx.verifiedUserId ?? null,
  },
  Mutation: {
    register: (_: unknown, args: { firstName: string; lastName: string; email: string; password: string }) =>
      authService.register(args.firstName, args.lastName, args.email, args.password),
    login: (_: unknown, args: { email: string; password: string }) => authService.login(args.email, args.password),
    assignUserRole: async (
      _: unknown,
      args: { userId: number; roleId?: number | null; updatedBy?: number },
      ctx: { token?: string; verifiedUserId?: number }
    ) => {
      // The signed-in user wins over an id typed into the request.
      const actorId = (await authService.userIdFromToken(ctx.token)) ?? ctx.verifiedUserId ?? args.updatedBy;
      return service.assignRole(args.userId, args.roleId ?? null, actorId);
    },
  },
};
