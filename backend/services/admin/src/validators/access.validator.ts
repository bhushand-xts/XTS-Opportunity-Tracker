export function validateRoleMenuPermissionMapping(
  roleId: number,
  menuId: number,
  permissionIds: number[],
  updatedBy: number
): void {

  if (
    roleId === undefined ||
    roleId === null ||
    !Number.isInteger(roleId) ||
    roleId <= 0
  ) {
    throw new Error("A valid roleId is required.");
  }

  if (
    menuId === undefined ||
    menuId === null ||
    !Number.isInteger(menuId) ||
    menuId <= 0
  ) {
    throw new Error("A valid menuId is required.");
  }

  if (!Array.isArray(permissionIds) || permissionIds.length === 0) {
    throw new Error("At least one permissionId is required.");
  }

  for (const permissionId of permissionIds) {
    if (!Number.isInteger(permissionId) || permissionId <= 0) {
      throw new Error("All permissionIds must be valid positive integers.");
    }
  }

  const uniqueIds = new Set(permissionIds);
  if (uniqueIds.size !== permissionIds.length) {
    throw new Error("Duplicate permissionIds are not allowed in the same request.");
  }

  if (
    updatedBy === undefined ||
    updatedBy === null ||
    !Number.isInteger(updatedBy) ||
    updatedBy <= 0
  ) {
    throw new Error("A valid updatedBy is required.");
  }
}