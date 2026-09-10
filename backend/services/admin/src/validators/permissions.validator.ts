export interface CreatePermissionInput {
  permissionName: string;
  permissionKey: string;
  description?: string | null;
  createdBy: number;
}

export interface UpdatePermissionInput {
  permissionName?: string;
  permissionKey?: string;
  description?: string | null;
  isActive?: boolean;
  updatedBy: number;
}

export function validateCreatePermission(
  input: CreatePermissionInput
): void {
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

export function validateUpdatePermission(
  input: UpdatePermissionInput
): void {
  if (
    input.permissionName !== undefined &&
    !input.permissionName.trim()
  ) {
    throw new Error("Permission name cannot be empty.");
  }

  if (
    input.permissionKey !== undefined &&
    !input.permissionKey.trim()
  ) {
    throw new Error("Permission key cannot be empty.");
  }

  if (!input.updatedBy) {
    throw new Error("Updated by is required.");
  }
}