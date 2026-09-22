import { useMutation } from "@apollo/client";
import { toast } from "sonner";
import type { Role, RoleInput } from "@xts/api-contracts";
import { CREATE_ROLE, GET_ROLES, UPDATE_ROLE } from "./role.queries";

interface CreateRoleResult {
  createRole: Role;
}
interface UpdateRoleResult {
  updateRole: Role;
}

export function useRoleMutations() {
  const [createRoleMutation, { loading: creating }] = useMutation<CreateRoleResult, { input: RoleInput }>(
    CREATE_ROLE,
    { refetchQueries: [GET_ROLES] }
  );

  const [updateRoleMutation, { loading: updating }] = useMutation<
    UpdateRoleResult,
    { id: number; input: RoleInput }
  >(UPDATE_ROLE, { refetchQueries: [GET_ROLES] });

  async function createRole(input: RoleInput): Promise<boolean> {
    try {
      await createRoleMutation({ variables: { input } });
      toast.success("Role added successfully.");
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add role.");
      return false;
    }
  }

  async function updateRole(id: string, input: RoleInput): Promise<boolean> {
    try {
      await updateRoleMutation({ variables: { id: Number(id), input } });
      toast.success("Role updated successfully.");
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update role.");
      return false;
    }
  }

  // Soft delete only — the backend's real deleteRole mutation still hard-
  // deletes the row (DELETE_ROLE in role.queries.ts is unused on purpose).
  // Deactivating via the existing updateRole mutation instead keeps the row
  // in the database, matching Menu/Permission Master's status-toggle pattern.
  async function toggleRoleStatus(id: string, roleName: string, isActive: boolean): Promise<boolean> {
    try {
      await updateRoleMutation({ variables: { id: Number(id), input: { roleName, isActive } } });
      toast.success(isActive ? "Role activated." : "Role deactivated.");
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update role status.");
      return false;
    }
  }

  return { createRole, updateRole, toggleRoleStatus, saving: creating || updating };
}
