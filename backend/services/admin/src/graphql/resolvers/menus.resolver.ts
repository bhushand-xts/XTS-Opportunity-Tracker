import { GraphQLError } from "graphql";
import { MenusRepository } from "../../repositories/menus.repository";
import { MenusService } from "../../services/menus.service";
import {
  CreateMenuInput,
  UpdateMenuInput
} from "../../validators/menus.validator";

const service = new MenusService(new MenusRepository());

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

export const menuResolvers = {
  Query: {
    menus: async (
      _: unknown,
      args: { asTree?: boolean }
    ) => {
      try {
        return await service.getMenus(args.asTree ?? false);
      } catch (error) {
        return handleError(error);
      }
    },

    menu: async (
      _: unknown,
      args: { menuId: number }
    ) => {
      try {
        return await service.getMenu(args.menuId);
      } catch (error) {
        return handleError(error);
      }
    }
  },

  Mutation: {
    createMenu: async (
      _: unknown,
      args: { input: CreateMenuInput }
    ) => {
      try {
        return await service.createMenu(args.input);
      } catch (error) {
        return handleError(error);
      }
    },

    updateMenu: async (
      _: unknown,
      args: {
        menuId: number;
        input: UpdateMenuInput;
      }
    ) => {
      try {
        return await service.updateMenu(
          args.menuId,
          args.input
        );
      } catch (error) {
        return handleError(error);
      }
    },

    toggleMenuStatus: async (
      _: unknown,
      args: {
        menuId: number;
        isActive: boolean;
        updatedBy: number;
      }
    ) => {
      try {
        return await service.toggleMenuStatus(
          args.menuId,
          args.isActive,
          args.updatedBy
        );
      } catch (error) {
        return handleError(error);
      }
    }
  }
};