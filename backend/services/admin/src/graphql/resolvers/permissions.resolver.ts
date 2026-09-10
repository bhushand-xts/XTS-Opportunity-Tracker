import { GraphQLError } from "graphql";

import { PermissionsRepository } from "../../repositories/permissions.repository";
import { PermissionsService } from "../../services/permissions.service";

import {
  CreatePermissionInput,
  UpdatePermissionInput
} from "../../validators/permissions.validator";

const repository = new PermissionsRepository();
const service = new PermissionsService(repository);

function handleError(error: unknown): never {

  const message =
    error instanceof Error
      ? error.message
      : "Internal server error.";

  throw new GraphQLError(message, {
    extensions: {
      code:
        message.includes("not found")
          ? "NOT_FOUND"
          : "BAD_USER_INPUT"
    }
  });
}

export const permissionResolvers = {

  Query: {

    permissions: async (
      _: unknown,
      args: {
        isActive?: boolean;
      }
    ) => {

      try {

        return await service.getPermissions(
          args.isActive
        );

      } catch (error) {
        handleError(error);
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
        handleError(error);
      }
    }
  },

  Mutation: {

    createPermission: async (
      _: unknown,
      args: {
        input: CreatePermissionInput;
      }
    ) => {

      try {

        return await service.createPermission(
          args.input
        );

      } catch (error) {
        handleError(error);
      }
    },

    updatePermission: async (
      _: unknown,
      args: {
        permissionId: number;
        input: UpdatePermissionInput;
      }
    ) => {

      try {

        return await service.updatePermission(
          args.permissionId,
          args.input
        );

      } catch (error) {
        handleError(error);
      }
    },

    deletePermission: async (
      _: unknown,
      args: {
        permissionId: number;
        updatedBy: number;
      }
    ) => {

      try {

        return await service.deletePermission(
          args.permissionId,
          args.updatedBy
        );

      } catch (error) {
        handleError(error);
      }
    }
  }
};