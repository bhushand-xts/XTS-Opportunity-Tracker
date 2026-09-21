"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.accessResolvers = void 0;
const graphql_1 = require("graphql");
const access_repository_1 = require("../../repositories/access.repository");
const access_service_1 = require("../../services/access.service");
const service = new access_service_1.AccessService(new access_repository_1.AccessRepository());
function handleError(error) {
    const message = error instanceof Error ? error.message : "Internal server error.";
    throw new graphql_1.GraphQLError(message, {
        extensions: {
            code: message.includes("not found") ? "NOT_FOUND" : "BAD_USER_INPUT"
        }
    });
}
exports.accessResolvers = {
    Query: {
        roleAccess: async (_, args) => {
            try {
                return await service.getRoleAccess(args.roleId);
            }
            catch (error) {
                return handleError(error);
            }
        },
        roleMenuPermissions: async (_, args) => {
            try {
                return await service.getRoleMenuPermissions(args.roleId, args.menuId);
            }
            catch (error) {
                return handleError(error);
            }
        },
        availablePermissionsForMenu: async (_, args) => {
            try {
                return await service.getAvailablePermissionsForMenu(args.menuId);
            }
            catch (error) {
                return handleError(error);
            }
        }
    },
    Mutation: {
        addRoleMenuPermissions: async (_, args) => {
            try {
                return await service.addRoleMenuPermissions(args.input.roleId, args.input.menuId, args.input.permissionIds, args.input.updatedBy);
            }
            catch (error) {
                return handleError(error);
            }
        },
        removeRoleMenuPermissions: async (_, args) => {
            try {
                return await service.removeRoleMenuPermissions(args.input.roleId, args.input.menuId, args.input.permissionIds, args.input.updatedBy);
            }
            catch (error) {
                return handleError(error);
            }
        }
    }
};
exports.default = exports.accessResolvers;
//# sourceMappingURL=access.resolver.js.map