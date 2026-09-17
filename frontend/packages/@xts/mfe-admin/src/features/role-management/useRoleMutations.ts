import { useMutation } from "@apollo/client";
import { toast } from "sonner";
import type { Role, RoleInput } from "@xts/api-contracts";
import { CREATE_ROLE, DELETE_ROLE, GET_ROLES, UPDATE_ROLE } from "./role.queries";

interface CreateRoleResult {
  createRole: Role;
}
interface UpdateRoleResult {
  updateRole: Role;
}
interface DeleteRoleResult {
  deleteRole: string;
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

  const [deleteRoleMutation, { loading: deleting }] = useMutation<DeleteRoleResult, { id: number }>(DELETE_ROLE, {
    refetchQueries: [GET_ROLES],
  });

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

  async function deleteRole(id: string): Promise<boolean> {
    try {
      await deleteRoleMutation({ variables: { id: Number(id) } });
      toast.success("Role deleted successfully.");
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete role.");
      return false;
    }
  }

  return { createRole, updateRole, deleteRole, saving: creating || updating || deleting };
}
