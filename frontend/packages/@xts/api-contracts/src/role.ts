// Mirrors the admin service's `Role` type
// (backend/services/admin/src/graphql/typeDefs/roles.typeDefs.ts).

export interface Role {
  id: number;
  roleName: string;
  roleCode: string | null;
  description: string | null;
  isActive: boolean;
  createdDt: string | null;
  updatedDt: string | null;
}

export interface RoleInput {
  roleName: string;
  roleCode?: string | null;
  description?: string | null;
  isActive: boolean;
  /** The signed-in user, recorded as created_by / updated_by. */
  createdBy?: number;
  updatedBy?: number;
}

/** One entry of a role's change history (mst_roles_tracker): the role as it
 * stood after a change. Newest first. */
export interface RoleHistory {
  trackerId: number;
  roleId: number;
  roleName: string;
  roleCode: string | null;
  description: string | null;
  isActive: boolean;
  createdDt: string | null;
  createdBy: number | null;
  updatedDt: string | null;
  updatedBy: number | null;
}
