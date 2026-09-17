import * as service from '../../services/user.service';
import * as authService from '../../services/auth.service';

// Keep business logic OUT of resolvers.

export default {
  Query: {
    userList: (_: unknown, args: Record<string, any>, ctx: unknown) => service.list(args, ctx),
    usersByRoleCount: (_: unknown, args: { roleId: number }) => service.countByRole(args.roleId),
  },
  Mutation: {
    register: (_: unknown, args: { firstName: string; lastName: string; email: string; password: string }) =>
      authService.register(args.firstName, args.lastName, args.email, args.password),
    login: (_: unknown, args: { email: string; password: string }) => authService.login(args.email, args.password),
  },
};
