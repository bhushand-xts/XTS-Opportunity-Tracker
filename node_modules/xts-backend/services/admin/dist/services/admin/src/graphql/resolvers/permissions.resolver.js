"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.permissionResolvers = void 0;
const graphql_1 = require("graphql");
const permissions_repository_1 = require("../../repositories/permissions.repository");
const permissions_service_1 = require("../../services/permissions.service");
const service = new permissions_service_1.PermissionsService(new permissions_repository_1.PermissionsRepository());
function handleError(error) {
    const message = error instanceof Error
        ? error.message
        : "Internal server error.";
    throw new graphql_1.GraphQLError(message, {
        extensions: {
            code: message.includes("not found")
                ? "NOT_FOUND"
                : "BAD_USER_INPUT"
        }
    });
}
exports.permissionResolvers = {
    // --------------------------------------------------
    // QUERY
    // --------------------------------------------------
    Query: {
        permissions: async () => {
            try {
                return await service.getPermissions();
            }
            catch (error) {
                return handleError(error);
            }
        },
        permission: async (_, args) => {
            try {
                return await service.getPermission(args.permissionId);
            }
            catch (error) {
                return handleError(error);
            }
        },
        menusForPermissionMapping: async () => {
            try {
                return await service.getMenuListForMapping();
            }
            catch (error) {
                return handleError(error);
            }
        },
        menuPermissions: async (_, args) => {
            try {
                return await service.getMenuPermissions(args.menuId);
            }
            catch (error) {
                return handleError(error);
            }
        },
        menuPermissionMappings: async () => {
            try {
                return await service.getMenuPermissionMappings();
            }
            catch (error) {
                return handleError(error);
            }
        }
    },
    // --------------------------------------------------
    // MUTATION
    // --------------------------------------------------
    Mutation: {
        createPermission: async (_, args) => {
            try {
                return await service.createPermission(args.input);
            }
            catch (error) {
                return handleError(error);
            }
        },
        updatePermission: async (_, args) => {
            try {
                return await service.updatePermission(args.permissionId, args.input);
            }
            catch (error) {
                return handleError(error);
            }
        },
        togglePermissionStatus: async (_, args) => {
            try {
                return await service.togglePermissionStatus(args.permissionId, args.isActive, args.updatedBy);
            }
            catch (error) {
                return handleError(error);
            }
        },
        saveMenuPermissions: async (_, args) => {
            try {
                return await service.saveMenuPermissions(args.input.menuId, args.input.permissionIds, args.input.updatedBy);
            }
            catch (error) {
                return handleError(error);
            }
        }
    }
};
exports.default = exports.permissionResolvers;
//# sourceMappingURL=permissions.resolver.js.map