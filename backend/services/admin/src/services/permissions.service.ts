import {
  PermissionsRepository,
  PermissionRecord
} from "../repositories/permissions.repository";

import {
  CreatePermissionInput,
  UpdatePermissionInput,
  validateCreatePermission,
  validateUpdatePermission
} from "../validators/permissions.validator";

export class PermissionsService {

  constructor(
    private readonly repository: PermissionsRepository
  ) {}

  async getPermissions(
    isActive?: boolean
  ): Promise<PermissionRecord[]> {

    return this.repository.findAll(isActive);
  }

  async getPermission(
    permissionId: number
  ): Promise<PermissionRecord | null> {

    return this.repository.findById(permissionId);
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
      await this.repository.findById(permissionId);

    if (!existing) {
      throw new Error("Permission not found.");
    }

    if (
      input.permissionKey !== undefined &&
      input.permissionKey.trim() !== existing.permissionKey
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

  async deletePermission(
    permissionId: number,
    updatedBy: number
  ): Promise<PermissionRecord> {

    const existing =
      await this.repository.findById(permissionId);

    if (!existing) {
      throw new Error("Permission not found.");
    }

    return this.repository.softDelete(
      permissionId,
      updatedBy
    );
  }
}