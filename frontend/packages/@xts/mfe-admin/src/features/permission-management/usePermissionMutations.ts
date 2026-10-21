import { useMutation } from "@apollo/client";
import type { CreatePermissionInput, Permission, UpdatePermissionInput } from "@xts/api-contracts";
import { requireUserId, runWithToast } from "../../lib/mutation";
import {
  CREATE_PERMISSION,
  GET_PERMISSIONS,
  TOGGLE_PERMISSION_STATUS,
  UPDATE_PERMISSION,
} from "./permission.queries";

type PermissionDetails = Omit<CreatePermissionInput, "createdBy">;

export function usePermissionMutations() {
  const refetch = { refetchQueries: [GET_PERMISSIONS] };

  const [createMutation, { loading: creating }] = useMutation<
    { createPermission: Permission },
    { input: CreatePermissionInput }
  >(CREATE_PERMISSION, refetch);
  const [updateMutation, { loading: updating }] = useMutation<
    { updatePermission: Permission },
    { permissionId: number; input: UpdatePermissionInput }
  >(UPDATE_PERMISSION, refetch);
  const [toggleMutation, { loading: toggling }] = useMutation<
    { togglePermissionStatus: Permission },
    { permissionId: number; isActive: boolean; updatedBy: number }
  >(TOGGLE_PERMISSION_STATUS, refetch);

  return {
    createPermission: (details: PermissionDetails) =>
      runWithToast(
        () => createMutation({ variables: { input: { ...details, createdBy: requireUserId() } } }),
        "Permission added.",
        "Failed to add permission."
      ),
    updatePermission: (permissionId: number, details: PermissionDetails) =>
      runWithToast(
        () => updateMutation({ variables: { permissionId, input: { ...details, updatedBy: requireUserId() } } }),
        "Permission updated.",
        "Failed to update permission."
      ),
    setPermissionActive: (permissionId: number, isActive: boolean) =>
      runWithToast(
        () => toggleMutation({ variables: { permissionId, isActive, updatedBy: requireUserId() } }),
        isActive ? "Permission activated." : "Permission deactivated.",
        "Failed to change permission status."
      ),
    saving: creating || updating || toggling,
  };
}
