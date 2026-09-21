import { useMutation } from "@apollo/client";
import { toast } from "sonner";
import { useAuth } from "@xts/design-system";
import { CREATE_PERMISSION, GET_PERMISSIONS, TOGGLE_PERMISSION_STATUS, UPDATE_PERMISSION } from "./permission.queries";
import type { Permission } from "./usePermissions";

export interface PermissionFormInput {
  permissionName: string;
  permissionKey: string;
  description: string | null;
}

interface CreatePermissionResult {
  createPermission: Permission;
}
interface UpdatePermissionResult {
  updatePermission: Permission;
}
interface TogglePermissionStatusResult {
  togglePermissionStatus: Permission;
}

export function usePermissionMutations() {
  const { session } = useAuth();

  const [createPermissionMutation, { loading: creating }] = useMutation<
    CreatePermissionResult,
    { input: PermissionFormInput & { createdBy: number } }
  >(CREATE_PERMISSION, { refetchQueries: [GET_PERMISSIONS] });

  const [updatePermissionMutation, { loading: updating }] = useMutation<
    UpdatePermissionResult,
    { permissionId: number; input: Partial<PermissionFormInput> & { updatedBy: number } }
  >(UPDATE_PERMISSION, { refetchQueries: [GET_PERMISSIONS] });

  const [togglePermissionStatusMutation, { loading: toggling }] = useMutation<
    TogglePermissionStatusResult,
    { permissionId: number; isActive: boolean; updatedBy: number }
  >(TOGGLE_PERMISSION_STATUS, { refetchQueries: [GET_PERMISSIONS] });

  async function createPermission(input: PermissionFormInput): Promise<boolean> {
    if (!session?.userId) {
      toast.error("You must be signed in to add a permission.");
      return false;
    }
    try {
      await createPermissionMutation({
        variables: { input: { ...input, createdBy: Number(session.userId) } },
      });
      toast.success("Permission added successfully.");
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add permission.");
      return false;
    }
  }

  async function updatePermission(permissionId: number, input: Partial<PermissionFormInput>): Promise<boolean> {
    if (!session?.userId) {
      toast.error("You must be signed in to update a permission.");
      return false;
    }
    try {
      await updatePermissionMutation({
        variables: { permissionId, input: { ...input, updatedBy: Number(session.userId) } },
      });
      toast.success("Permission updated successfully.");
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update permission.");
      return false;
    }
  }

  async function togglePermissionStatus(permissionId: number, isActive: boolean): Promise<boolean> {
    if (!session?.userId) {
      toast.error("You must be signed in to change a permission's status.");
      return false;
    }
    try {
      await togglePermissionStatusMutation({
        variables: { permissionId, isActive, updatedBy: Number(session.userId) },
      });
      toast.success(`Permission ${isActive ? "activated" : "deactivated"} successfully.`);
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update permission status.");
      return false;
    }
  }

  return { createPermission, updatePermission, togglePermissionStatus, saving: creating || updating || toggling };
}
