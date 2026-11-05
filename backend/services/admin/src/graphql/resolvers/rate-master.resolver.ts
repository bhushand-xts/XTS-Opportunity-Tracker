import { GraphQLError } from "graphql";
import { actingUserId, RequestContext } from "../context";

import {
  RateMasterRepository
} from "../../repositories/rate-master.repository";

import {
  RateMasterService
} from "../../services/rate-master.service";

import {
  CreateRateMasterInput,
  UpdateRateMasterInput
} from "../../validators/rate-master.validator";


const service =
  new RateMasterService(
    new RateMasterRepository()
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


export const rateMasterResolvers = {

  // --------------------------------------------------
  // QUERY
  // --------------------------------------------------

  Query: {

    rateMasters: async () => {

      try {

        return await service.getRateMasters();

      } catch (error) {

        return handleError(error);
      }
    },


    rateMaster: async (
      _: unknown,
      args: {
        ratemasterId: number;
      }
    ) => {

      try {

        return await service.getRateMaster(
          args.ratemasterId
        );

      } catch (error) {

        return handleError(error);
      }
    }
  },


  // --------------------------------------------------
  // MUTATION
  // --------------------------------------------------

  Mutation: {

    createRateMaster: async (
      _: unknown,
      args: {
        input: CreateRateMasterInput;
      },
      ctx: RequestContext
    ) => {

      try {

        return await service.createRateMaster(
          {
            ...args.input,
            createdBy: actingUserId(
              ctx,
              args.input.createdBy
            ) as number
          }
        );

      } catch (error) {

        return handleError(error);
      }
    },


    updateRateMaster: async (
      _: unknown,
      args: {
        ratemasterId: number;
        input: UpdateRateMasterInput;
      },
      ctx: RequestContext
    ) => {

      try {

        return await service.updateRateMaster(
          args.ratemasterId,
          {
            ...args.input,
            updatedBy: actingUserId(
              ctx,
              args.input.updatedBy
            ) as number
          }
        );

      } catch (error) {

        return handleError(error);
      }
    },


    toggleRateMasterStatus: async (
      _: unknown,
      args: {
        ratemasterId: number;
        isActive: boolean;
        updatedBy?: number;
      },
      ctx: RequestContext
    ) => {

      try {

        return await service.toggleRateMasterStatus(
          args.ratemasterId,
          args.isActive,
          actingUserId(
            ctx,
            args.updatedBy
          ) as number
        );

      } catch (error) {

        return handleError(error);
      }
    }
  }
};


export default rateMasterResolvers;