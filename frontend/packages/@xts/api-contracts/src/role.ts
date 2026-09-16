export interface Role {
  id: string;
  roleName: string;
  roleCode: string;
  isActive: boolean;
  /** User IDs currently assigned this role. Populated by User Role
   * Assignment once it exists — deletion must be blocked while non-empty. */
  assignedUserIds: string[];
}

export interface RoleInput {
  roleName: string;
  isActive: boolean;
}
