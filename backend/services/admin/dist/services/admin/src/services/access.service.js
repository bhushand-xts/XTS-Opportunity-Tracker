"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccessService = void 0;
const access_validator_1 = require("../validators/access.validator");
class AccessService {
    constructor(repository) {
        this.repository = repository;
    }
    async getRoleAccess(roleId) {
        const roleExists = await this.repository.roleExists(roleId);
        if (!roleExists) {
            throw new Error("Role not found.");
        }
        return this.repository.getRoleAccess(roleId);
    }
    async getRoleMenuPermissions(roleId, menuId) {
        const roleExists = await this.repository.roleExists(roleId);
        if (!roleExists) {
            throw new Error("Role not found.");
        }
        const menuExists = await this.repository.menuExists(menuId);
        if (!menuExists) {
            throw new Error("Menu not found.");
        }
        return this.repository.getRoleMenuPermissions(roleId, menuId);
    }
    async getAvailablePermissionsForMenu(menuId) {
        const menuExists = await this.repository.menuExists(menuId);
        if (!menuExists) {
            throw new Error("Menu not found.");
        }
        return this.repository.getAvailablePermissionsForMenu(menuId);
    }
    async addRoleMenuPermissions(roleId, menuId, permissionIds, updatedBy) {
        (0, access_validator_1.validateRoleMenuPermissionMapping)(roleId, menuId, permissionIds, updatedBy);
        const roleExists = await this.repository.roleExists(roleId);
        if (!roleExists) {
            throw new Error("Role not found.");
        }
        const menuExists = await this.repository.menuExists(menuId);
        if (!menuExists) {
            throw new Error("Menu not found.");
        }
        for (const permissionId of permissionIds) {
            const valid = await this.repository.permissionValidForMenu(menuId, permissionId);
            if (!valid) {
                throw new Error(`Permission ${permissionId} is not assigned to menu ${menuId}. Assign it to the menu first.`);
            }
        }
        await this.repository.addRoleMenuPermissions(roleId, menuId, permissionIds, updatedBy);
        return this.repository.getRoleMenuPermissions(roleId, menuId);
    }
    async removeRoleMenuPermissions(roleId, menuId, permissionIds, updatedBy) {
        (0, access_validator_1.validateRoleMenuPermissionMapping)(roleId, menuId, permissionIds, updatedBy);
        const roleExists = await this.repository.roleExists(roleId);
        if (!roleExists) {
            throw new Error("Role not found.");
        }
        await this.repository.removeRoleMenuPermissions(roleId, menuId, permissionIds, updatedBy);
        return this.repository.getRoleMenuPermissions(roleId, menuId);
    }
}
exports.AccessService = AccessService;
//# sourceMappingURL=access.service.js.map