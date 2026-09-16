import { useMutation } from "@apollo/client";
import { toast } from "sonner";
import type { Permission, PermissionInput } from "@xts/api-contracts";
import { CREATE_PERMISSION, DELETE_PERMISSION, GET_PERMISSIONS, UPDATE_PERMISSION } from "./permission.queries";

interface CreatePermissionResult {
  createPermission: Permission;
}
interface UpdatePermissionResult {
  updatePermission: Permission;
}
interface DeletePermissionResult {
  deletePermission: string;
}

export function usePermissionMutations() {
  const [createPermissionMutation, { loading: creating }] = useMutation<
    CreatePermissionResult,
    { input: PermissionInput }
  >(CREATE_PERMISSION, { refetchQueries: [GET_PERMISSIONS] });

  const [updatePermissionMutation, { loading: updating }] = useMutation<
    UpdatePermissionResult,
    { id: string; input: PermissionInput }
  >(UPDATE_PERMISSION, { refetchQueries: [GET_PERMISSIONS] });

  const [deletePermissionMutation, { loading: deleting }] = useMutation<DeletePermissionResult, { id: string }>(
    DELETE_PERMISSION,
    { refetchQueries: [GET_PERMISSIONS] }
  );

  async function createPermission(input: PermissionInput): Promise<boolean> {
    try {
      await createPermissionMutation({ variables: { input } });
      toast.success("Permission added successfully.");
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add permission.");
      return false;
    }
  }

  async function updatePermission(id: string, input: PermissionInput): Promise<boolean> {
    try {
      await updatePermissionMutation({ variables: { id, input } });
      toast.success("Permission updated successfully.");
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update permission.");
      return false;
    }
  }

  async function deletePermission(id: string): Promise<boolean> {
    try {
      await deletePermissionMutation({ variables: { id } });
      toast.success("Permission deleted successfully.");
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete permission.");
      return false;
    }
  }

  return { createPermission, updatePermission, deletePermission, saving: creating || updating || deleting };
}
