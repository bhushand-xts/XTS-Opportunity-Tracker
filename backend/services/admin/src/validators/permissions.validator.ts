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

// Column sizes of mst_permissions — checking here gives a readable message
// instead of a database "value too long" error.
const MAX_NAME = 100;
const MAX_KEY = 100;
const MAX_DESCRIPTION = 500;

function validateLengths(input: {
  permissionName?: string;
  permissionKey?: string;
  description?: string | null;
}): void {

  if (
    input.permissionName &&
    input.permissionName.trim().length > MAX_NAME
  ) {
    throw new Error(
      `Permission name must be at most ${MAX_NAME} characters.`
    );
  }

  if (
    input.permissionKey &&
    input.permissionKey.trim().length > MAX_KEY
  ) {
    throw new Error(
      `Permission key must be at most ${MAX_KEY} characters.`
    );
  }

  if (
    input.description &&
    input.description.length > MAX_DESCRIPTION
  ) {
    throw new Error(
      `Description must be at most ${MAX_DESCRIPTION} characters.`
    );
  }
}


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

  validateLengths(input);

  if (!input.createdBy) {

    throw new Error(
      "You must be signed in to make changes."
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

  validateLengths(input);

  if (!input.updatedBy) {

    throw new Error(
      "You must be signed in to make changes."
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
      "You must be signed in to make changes."
    );
  }
}