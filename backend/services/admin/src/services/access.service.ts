import { AccessRepository, RoleMenuPermissionRecord } from "../repositories/access.repository";
import { validateRoleMenuPermissionMapping } from "../validators/access.validator";
export class AccessService {

  constructor(private readonly repository: AccessRepository) {}

  async getRoleAccess(roleId: number): Promise<RoleMenuPermissionRecord[]> {

    const roleExists = await this.repository.roleExists(roleId);
    if (!roleExists) {
      throw new Error("Role not found.");
    }

    return this.repository.getRoleAccess(roleId);
  }

  async getRoleMenuPermissions(
    roleId: number,
    menuId: number
  ): Promise<RoleMenuPermissionRecord[]> {

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

  async getAvailablePermissionsForMenu(menuId: number) {

    const menuExists = await this.repository.menuExists(menuId);
    if (!menuExists) {
      throw new Error("Menu not found.");
    }

    return this.repository.getAvailablePermissionsForMenu(menuId);
  }

  async addRoleMenuPermissions(
    roleId: number,
    menuId: number,
    permissionIds: number[],
    updatedBy: number
  ): Promise<RoleMenuPermissionRecord[]> {
    validateRoleMenuPermissionMapping(roleId, menuId, permissionIds, updatedBy);

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
        throw new Error(
          `Permission ${permissionId} is not assigned to menu ${menuId}. Assign it to the menu first.`
        );
      }
    }

    await this.repository.addRoleMenuPermissions(roleId, menuId, permissionIds, updatedBy);

    return this.repository.getRoleMenuPermissions(roleId, menuId);
  }

  async removeRoleMenuPermissions(
    roleId: number,
    menuId: number,
    permissionIds: number[],
    updatedBy: number
  ): Promise<RoleMenuPermissionRecord[]> {
    validateRoleMenuPermissionMapping(roleId, menuId, permissionIds, updatedBy);

    const roleExists = await this.repository.roleExists(roleId);
    if (!roleExists) {
      throw new Error("Role not found.");
    }

    await this.repository.removeRoleMenuPermissions(roleId, menuId, permissionIds, updatedBy);

    return this.repository.getRoleMenuPermissions(roleId, menuId);
  }
}