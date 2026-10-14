import { GraphQLError } from "graphql";
import { actingUserId, RequestContext } from "../context";
import * as service from "../../services/account-type.service";

function handleError(error: unknown): never {
  const message =
    error instanceof Error ? error.message : "Internal server error.";

  throw new GraphQLError(message, {
    extensions: {
      code: message.includes("not found")
        ? "NOT_FOUND"
        : "BAD_USER_INPUT"
    }
  });
}

export const accountTypeResolvers = {
  Query: {
    accountTypes: async () => {
      try {
        return await service.list();
      } catch (error) {
        return handleError(error);
      }
    },

    accountType: async (
      _: unknown,
      args: { accountTypeId: number }
    ) => {
      try {
        return await service.get(args.accountTypeId);
      } catch (error) {
        return handleError(error);
      }
    }
  },

  Mutation: {
    createAccountType: async (
      _: unknown,
      args: { input: any },
      ctx: RequestContext
    ) => {
      try {
        return await service.create({
          ...args.input,
          createdBy: actingUserId(ctx, args.input.createdBy) as number
        }, ctx);
      } catch (error) {
        return handleError(error);
      }
    },

    updateAccountType: async (
      _: unknown,
      args: {
        accountTypeId: number;
        input: any;
      },
      ctx: RequestContext
    ) => {
      try {
        return await service.update(
          args.accountTypeId,
          {
            ...args.input,
            updatedBy: actingUserId(ctx, args.input.updatedBy) as number
          },
          ctx
        );
      } catch (error) {
        return handleError(error);
      }
    },

    toggleAccountTypeStatus: async (
      _: unknown,
      args: {
        accountTypeId: number;
        isActive: boolean;
        updatedBy?: number;
      },
      ctx: RequestContext
    ) => {
      try {
        return await service.toggleStatus(
          args.accountTypeId,
          args.isActive,
          ctx,
          actingUserId(ctx, args.updatedBy) as number
        );
      } catch (error) {
        return handleError(error);
      }
    }
  }
};

export default accountTypeResolvers;
