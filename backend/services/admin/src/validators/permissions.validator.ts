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
  updatedBy: number;
}


// --------------------------------------------------
// PERMISSION VALIDATION
// --------------------------------------------------

export function validateCreatePermission(
  input: CreatePermissionInput
): void {

  if (!input.permissionName?.trim()) {

    throw new Error(
      "Permission name is required."
    );
  }

  if (!input.permissionKey?.trim()) {

    throw new Error(
      "Permission key is required."
    );
  }

  if (!input.createdBy) {

    throw new Error(
      "Created by is required."
    );
  }
}


export function validateUpdatePermission(
  input: UpdatePermissionInput
): void {

  if (
    input.permissionName !== undefined &&
    !input.permissionName.trim()
  ) {

    throw new Error(
      "Permission name cannot be empty."
    );
  }

  if (
    input.permissionKey !== undefined &&
    !input.permissionKey.trim()
  ) {

    throw new Error(
      "Permission key cannot be empty."
    );
  }

  if (!input.updatedBy) {

    throw new Error(
      "Updated by is required."
    );
  }
}


// --------------------------------------------------
// MENU-PERMISSION MAPPING VALIDATION
// --------------------------------------------------

export function validateMenuPermissionMapping(
  menuId: number,
  permissionIds: number[],
  updatedBy: number
): void {

  if (!menuId) {

    throw new Error(
      "Menu is required."
    );
  }

  if (
    !permissionIds ||
    permissionIds.length === 0
  ) {

    throw new Error(
      "At least one permission is required."
    );
  }

  if (!updatedBy) {

    throw new Error(
      "Updated by is required."
    );
  }
}