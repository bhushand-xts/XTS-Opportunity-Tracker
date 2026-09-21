"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PermissionsService = void 0;
const permissions_validator_1 = require("../validators/permissions.validator");
class PermissionsService {
    constructor(repository) {
        this.repository = repository;
    }
    // --------------------------------------------------
    // PERMISSION MANAGEMENT
    // --------------------------------------------------
    async getPermissions() {
        return this.repository.findAll();
    }
    async getPermission(permissionId) {
        return this.repository.findById(permissionId);
    }
    async createPermission(input) {
        (0, permissions_validator_1.validateCreatePermission)(input);
        const existing = await this.repository.findByKey(input.permissionKey.trim());
        if (existing) {
            throw new Error("A permission with this permission key already exists.");
        }
        return this.repository.create(input);
    }
    async updatePermission(permissionId, input) {
        (0, permissions_validator_1.validateUpdatePermission)(input);
        const existing = await this.repository.findById(permissionId);
        if (!existing) {
            throw new Error("Permission not found.");
        }
        if (input.permissionKey !== undefined &&
            input.permissionKey.trim() !==
                existing.permissionKey) {
            const duplicate = await this.repository.findByKey(input.permissionKey.trim());
            if (duplicate &&
                duplicate.permissionId !== permissionId) {
                throw new Error("A permission with this permission key already exists.");
            }
        }
        return this.repository.update(permissionId, input);
    }
    async togglePermissionStatus(permissionId, isActive, updatedBy) {
        const permission = await this.repository.findById(permissionId);
        if (!permission) {
            throw new Error("Permission not found.");
        }
        return this.repository.updateStatus(permissionId, isActive, updatedBy);
    }
    // --------------------------------------------------
    // MENU-PERMISSION MAPPING
    // --------------------------------------------------
    async getMenuListForMapping() {
        return this.repository.getMenuListForMapping();
    }
    async getMenuPermissions(menuId) {
        const menuExists = await this.repository.menuExists(menuId);
        if (!menuExists) {
            throw new Error("Menu not found.");
        }
        return this.repository.getMenuPermissions(menuId);
    }
    async getMenuPermissionMappings() {
        return this.repository.getMenuPermissionMappings();
    }
    async saveMenuPermissions(menuId, permissionIds, updatedBy) {
        (0, permissions_validator_1.validateMenuPermissionMapping)(menuId, permissionIds, updatedBy);
        const menuExists = await this.repository.menuExists(menuId);
        if (!menuExists) {
            throw new Error("Menu not found.");
        }
        for (const permissionId of permissionIds) {
            const permissionExists = await this.repository.permissionExists(permissionId);
            if (!permissionExists) {
                throw new Error("Permission not found.");
            }
        }
        await this.repository.saveMenuPermissions(menuId, permissionIds, updatedBy);
        return this.repository.getMenuPermissions(menuId);
    }
}
exports.PermissionsService = PermissionsService;
//# sourceMappingURL=permissions.service.js.map