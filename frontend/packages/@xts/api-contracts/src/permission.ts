export interface Permission {
  id: string;
  permissionName: string;
  isActive: boolean;
  /** Role IDs this permission is currently assigned to. Populated by Role
   * Master once it exists — deletion must be blocked while non-empty. */
  assignedRoleIds: string[];
}

export interface PermissionInput {
  permissionName: string;
  isActive: boolean;
}
