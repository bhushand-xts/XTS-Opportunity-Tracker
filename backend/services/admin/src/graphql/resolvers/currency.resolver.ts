import { GraphQLError } from "graphql";
import { actingUserId, RequestContext } from "../context";
import * as service from "../../services/currency.service";

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

export const currencyResolvers = {
  Query: {
    currencies: async () => {
      try {
        return await service.list();
      } catch (error) {
        return handleError(error);
      }
    },

    currency: async (
      _: unknown,
      args: { currencyId: number }
    ) => {
      try {
        return await service.get(args.currencyId);
      } catch (error) {
        return handleError(error);
      }
    }
  },

  Mutation: {
    createCurrency: async (
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

    updateCurrency: async (
      _: unknown,
      args: {
        currencyId: number;
        input: any;
      },
      ctx: RequestContext
    ) => {
      try {
        return await service.update(
          args.currencyId,
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

    toggleCurrencyStatus: async (
      _: unknown,
      args: {
        currencyId: number;
        isActive: boolean;
        updatedBy?: number;
      },
      ctx: RequestContext
    ) => {
      try {
        return await service.toggleStatus(
          args.currencyId,
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

export default currencyResolvers;