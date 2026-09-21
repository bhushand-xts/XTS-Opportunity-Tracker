"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateCreatePermission = validateCreatePermission;
exports.validateUpdatePermission = validateUpdatePermission;
exports.validateMenuPermissionMapping = validateMenuPermissionMapping;
// --------------------------------------------------
// PERMISSION VALIDATION
// --------------------------------------------------
function validateCreatePermission(input) {
    if (!input.permissionName?.trim()) {
        throw new Error("Permission name is required.");
    }
    if (!input.permissionKey?.trim()) {
        throw new Error("Permission key is required.");
    }
    if (!input.createdBy) {
        throw new Error("Created by is required.");
    }
}
function validateUpdatePermission(input) {
    if (input.permissionName !== undefined &&
        !input.permissionName.trim()) {
        throw new Error("Permission name cannot be empty.");
    }
    if (input.permissionKey !== undefined &&
        !input.permissionKey.trim()) {
        throw new Error("Permission key cannot be empty.");
    }
    if (!input.updatedBy) {
        throw new Error("Updated by is required.");
    }
}
// --------------------------------------------------
// MENU-PERMISSION MAPPING VALIDATION
// --------------------------------------------------
function validateMenuPermissionMapping(menuId, permissionIds, updatedBy) {
    if (!menuId) {
        throw new Error("Menu is required.");
    }
    if (!permissionIds ||
        permissionIds.length === 0) {
        throw new Error("At least one permission is required.");
    }
    if (!updatedBy) {
        throw new Error("Updated by is required.");
    }
}
//# sourceMappingURL=permissions.validator.js.map