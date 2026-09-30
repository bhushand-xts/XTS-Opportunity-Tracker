import { GraphQLError } from "graphql";
import { actingUserId, RequestContext } from "../context";

import {
  PermissionsRepository
} from "../../repositories/permissions.repository";

import {
  PermissionsService
} from "../../services/permissions.service";

import {
  CreatePermissionInput,
  UpdatePermissionInput
} from "../../validators/permissions.validator";


const service =
  new PermissionsService(
    new PermissionsRepository()
  );


function handleError(
  error: unknown
): never {

  const message =
    error instanceof Error
      ? error.message
      : "Internal server error.";

  throw new GraphQLError(
    message,
    {
      extensions: {
        code: message.includes("not found")
          ? "NOT_FOUND"
          : "BAD_USER_INPUT"
      }
    }
  );
}


export const permissionResolvers = {

  // --------------------------------------------------
  // QUERY
  // --------------------------------------------------

  Query: {

    permissions: async () => {

      try {

        return await service.getPermissions();

      } catch (error) {

        return handleError(error);
      }
    },


    permission: async (
      _: unknown,
      args: {
        permissionId: number;
      }
    ) => {

      try {

        return await service.getPermission(
          args.permissionId
        );

      } catch (error) {

        return handleError(error);
      }
    },


    permissionHistory: async (
      _: unknown,
      args: {
        permissionId: number;
      }
    ) => {

      try {

        return await service.getPermissionHistory(
          args.permissionId
        );

      } catch (error) {

        return handleError(error);
      }
    },


    menusForPermissionMapping: async () => {

      try {

        return await service.getMenuListForMapping();

      } catch (error) {

        return handleError(error);
      }
    },


    menuPermissions: async (
      _: unknown,
      args: {
        menuId: number;
      }
    ) => {

      try {

        return await service.getMenuPermissions(
          args.menuId
        );

      } catch (error) {

        return handleError(error);
      }
    },


    menuPermissionMappings: async () => {

      try {

        return await service.getMenuPermissionMappings();

      } catch (error) {

        return handleError(error);
      }
    }
  },


  // --------------------------------------------------
  // MUTATION
  // --------------------------------------------------

  Mutation: {

    createPermission: async (
      _: unknown,
      args: {
        input: CreatePermissionInput;
      },
      ctx: RequestContext
    ) => {

      try {

        return await service.createPermission(
          {
            ...args.input,
            createdBy: actingUserId(ctx, args.input.createdBy) as number
          }
        );

      } catch (error) {

        return handleError(error);
      }
    },


    updatePermission: async (
      _: unknown,
      args: {
        permissionId: number;
        input: UpdatePermissionInput;
      },
      ctx: RequestContext
    ) => {

      try {

        return await service.updatePermission(
          args.permissionId,
          {
            ...args.input,
            updatedBy: actingUserId(ctx, args.input.updatedBy) as number
          }
        );

      } catch (error) {

        return handleError(error);
      }
    },


    togglePermissionStatus: async (
      _: unknown,
      args: {
        permissionId: number;
        isActive: boolean;
        updatedBy?: number;
      },
      ctx: RequestContext
    ) => {

      try {

        return await service.togglePermissionStatus(
          args.permissionId,
          args.isActive,
          actingUserId(ctx, args.updatedBy) as number
        );

      } catch (error) {

        return handleError(error);
      }
    },


    saveMenuPermissions: async (
      _: unknown,
      args: {
        input: {
          menuId: number;
          permissionIds: number[];
          updatedBy?: number;
        };
      },
      ctx: RequestContext
    ) => {

      try {

        return await service.saveMenuPermissions(
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

export default permissionResolvers;