import {
  PermissionsRepository,
  PermissionRecord,
  MenuPermissionMappingRecord
} from "../repositories/permissions.repository";

import {
  CreatePermissionInput,
  UpdatePermissionInput,
  validateCreatePermission,
  validateUpdatePermission,
  validateMenuPermissionMapping
} from "../validators/permissions.validator";

export class PermissionsService {

  constructor(
    private readonly repository: PermissionsRepository
  ) {}


  // --------------------------------------------------
  // PERMISSION MANAGEMENT
  // --------------------------------------------------

  async getPermissions(): Promise<PermissionRecord[]> {

    return this.repository.findAll();
  }


  async getPermission(
    permissionId: number
  ): Promise<PermissionRecord | null> {

    return this.repository.findById(
      permissionId
    );
  }


  async createPermission(
    input: CreatePermissionInput
  ): Promise<PermissionRecord> {

    validateCreatePermission(input);

    const existing =
      await this.repository.findByKey(
        input.permissionKey.trim()
      );

    if (existing) {

      throw new Error(
        "A permission with this permission key already exists."
      );
    }

    return this.repository.create(input);
  }


  async updatePermission(
    permissionId: number,
    input: UpdatePermissionInput
  ): Promise<PermissionRecord> {

    validateUpdatePermission(input);

    const existing =
      await this.repository.findById(
        permissionId
      );

    if (!existing) {

      throw new Error(
        "Permission not found."
      );
    }

    if (
      input.permissionKey !== undefined &&
      input.permissionKey.trim() !==
        existing.permissionKey
    ) {

      const duplicate =
        await this.repository.findByKey(
          input.permissionKey.trim()
        );

      if (
        duplicate &&
        duplicate.permissionId !== permissionId
      ) {

        throw new Error(
          "A permission with this permission key already exists."
        );
      }
    }

    return this.repository.update(
      permissionId,
      input
    );
  }


  async togglePermissionStatus(
    permissionId: number,
    isActive: boolean,
    updatedBy: number
  ): Promise<PermissionRecord> {

    const permission =
      await this.repository.findById(
        permissionId
      );

    if (!permission) {

      throw new Error(
        "Permission not found."
      );
    }

    return this.repository.updateStatus(
      permissionId,
      isActive,
      updatedBy
    );
  }


  // --------------------------------------------------
  // MENU-PERMISSION MAPPING
  // --------------------------------------------------

  async getMenuListForMapping() {

    return this.repository.getMenuListForMapping();
  }


  async getMenuPermissions(
    menuId: number
  ): Promise<PermissionRecord[]> {

    const menuExists =
      await this.repository.menuExists(
        menuId
      );

    if (!menuExists) {

      throw new Error(
        "Menu not found."
      );
    }

    return this.repository.getMenuPermissions(
      menuId
    );
  }


  async getMenuPermissionMappings():
    Promise<MenuPermissionMappingRecord[]> {

    return this.repository.getMenuPermissionMappings();
  }


  async saveMenuPermissions(
    menuId: number,
    permissionIds: number[],
    updatedBy: number
  ): Promise<PermissionRecord[]> {

    validateMenuPermissionMapping(
      menuId,
      permissionIds,
      updatedBy
    );

    const menuExists =
      await this.repository.menuExists(
        menuId
      );

    if (!menuExists) {

      throw new Error(
        "Menu not found."
      );
    }

    for (const permissionId of permissionIds) {

      const permissionExists =
        await this.repository.permissionExists(
          permissionId
        );

      if (!permissionExists) {

        throw new Error(
          "Permission not found."
        );
      }
    }

    await this.repository.saveMenuPermissions(
      menuId,
      permissionIds,
      updatedBy
    );

    return this.repository.getMenuPermissions(
      menuId
    );
  }
}