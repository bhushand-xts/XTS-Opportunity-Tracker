import { GraphQLError } from "graphql";
import { actingUserId, RequestContext } from "../context";
import { AccessRepository } from "../../repositories/access.repository";
import { AccessService } from "../../services/access.service";

const service = new AccessService(new AccessRepository());

function handleError(error: unknown): never {
  const message = error instanceof Error ? error.message : "Internal server error.";
  throw new GraphQLError(message, {
    extensions: {
      code: message.includes("not found") ? "NOT_FOUND" : "BAD_USER_INPUT"
    }
  });
}

export const accessResolvers = {
  Query: {
    roleAccess: async (_: unknown, args: { roleId: number }) => {
      try {
        return await service.getRoleAccess(args.roleId);
      } catch (error) {
        return handleError(error);
      }
    },

    roleMenuPermissions: async (_: unknown, args: { roleId: number; menuId: number }) => {
      try {
        return await service.getRoleMenuPermissions(args.roleId, args.menuId);
      } catch (error) {
        return handleError(error);
      }
    },

    availablePermissionsForMenu: async (_: unknown, args: { menuId: number }) => {
      try {
        return await service.getAvailablePermissionsForMenu(args.menuId);
      } catch (error) {
        return handleError(error);
      }
    }
  },

  Mutation: {
    addRoleMenuPermissions: async (
      _: unknown,
      args: { input: { roleId: number; menuId: number; permissionIds: number[]; updatedBy?: number } },
      ctx: RequestContext
    ) => {
      try {
        return await service.addRoleMenuPermissions(
          args.input.roleId,
          args.input.menuId,
          args.input.permissionIds,
          actingUserId(ctx, args.input.updatedBy) as number
        );
      } catch (error) {
        return handleError(error);
      }
    },

    removeRoleMenuPermissions: async (
      _: unknown,
      args: { input: { roleId: number; menuId: number; permissionIds: number[]; updatedBy?: number } },
      ctx: RequestContext
    ) => {
      try {
        return await service.removeRoleMenuPermissions(
          args.input.roleId,
          args.input.menuId,
          args.input.permissionIds,
          actingUserId(ctx, args.input.updatedBy) as number
        );
      } catch (error) {
        return handleError(error);
      }
    }
  }
};

export default accessResolvers;