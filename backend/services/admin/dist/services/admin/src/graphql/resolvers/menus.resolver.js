"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.menuResolvers = void 0;
const graphql_1 = require("graphql");
const menus_repository_1 = require("../../repositories/menus.repository");
const menus_service_1 = require("../../services/menus.service");
const service = new menus_service_1.MenusService(new menus_repository_1.MenusRepository());
function handleError(error) {
    const message = error instanceof Error ? error.message : "Internal server error.";
    throw new graphql_1.GraphQLError(message, {
        extensions: {
            code: message.includes("not found")
                ? "NOT_FOUND"
                : "BAD_USER_INPUT"
        }
    });
}
exports.menuResolvers = {
    Query: {
        menus: async (_, args) => {
            try {
                return await service.getMenus(args.asTree ?? false);
            }
            catch (error) {
                return handleError(error);
            }
        },
        menu: async (_, args) => {
            try {
                return await service.getMenu(args.menuId);
            }
            catch (error) {
                return handleError(error);
            }
        }
    },
    Mutation: {
        createMenu: async (_, args) => {
            try {
                return await service.createMenu(args.input);
            }
            catch (error) {
                return handleError(error);
            }
        },
        updateMenu: async (_, args) => {
            try {
                return await service.updateMenu(args.menuId, args.input);
            }
            catch (error) {
                return handleError(error);
            }
        },
        toggleMenuStatus: async (_, args) => {
            try {
                return await service.toggleMenuStatus(args.menuId, args.isActive, args.updatedBy);
            }
            catch (error) {
                return handleError(error);
            }
        }
    }
};
exports.default = exports.menuResolvers;
//# sourceMappingURL=menus.resolver.js.map