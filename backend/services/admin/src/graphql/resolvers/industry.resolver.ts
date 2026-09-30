import { GraphQLError } from "graphql";
import { actingUserId, RequestContext } from "../context";
import * as service from "../../services/industry.service";

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

export const industryResolvers = {
  Query: {
    industries: async () => {
      try {
        return await service.list();
      } catch (error) {
        return handleError(error);
      }
    },

    industry: async (
      _: unknown,
      args: { industryId: number }
    ) => {
      try {
        return await service.get(args.industryId);
      } catch (error) {
        return handleError(error);
      }
    }
  },

  Mutation: {
    createIndustry: async (
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

    updateIndustry: async (
      _: unknown,
      args: {
        industryId: number;
        input: any;
      },
      ctx: RequestContext
    ) => {
      try {
        return await service.update(
          args.industryId,
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

    toggleIndustryStatus: async (
      _: unknown,
      args: {
        industryId: number;
        isActive: boolean;
        updatedBy?: number;
      },
      ctx: RequestContext
    ) => {
      try {
        return await service.toggleStatus(
          args.industryId,
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

export default industryResolvers;
