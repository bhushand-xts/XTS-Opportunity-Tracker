import { useMutation } from "@apollo/client";
import { toast } from "sonner";
import { useAuth } from "@xts/design-system";
import {
  ADD_ROLE_MENU_PERMISSIONS,
  GET_AVAILABLE_PERMISSIONS_FOR_MENU,
  GET_ROLE_MENU_PERMISSIONS,
  REMOVE_ROLE_MENU_PERMISSIONS,
} from "./roleMenuPermission.queries";
import type { RoleMenuPermission } from "./useRoleMenuPermissions";

export interface RoleMenuPermissionInput {
  roleId: number;
  menuId: number;
  permissionIds: number[];
  updatedBy: number;
}

interface AddRoleMenuPermissionsResult {
  addRoleMenuPermissions: RoleMenuPermission[];
}
interface RemoveRoleMenuPermissionsResult {
  removeRoleMenuPermissions: RoleMenuPermission[];
}

export interface SaveRoleMenuPermissionsParams {
  roleId: number;
  menuId: number;
  /** The permissionIds granted before this edit session (the last fetched roleMenuPermissions snapshot). */
  originalPermissionIds: number[];
  /** The permissionIds currently checked in the UI. */
  selectedPermissionIds: number[];
}

/**
 * addRoleMenuPermissions/removeRoleMenuPermissions are DELTA operations —
 * only the permissionIds being added or removed are sent, never the full
 * desired state. This diffs the checkbox selection against the original
 * roleMenuPermissions snapshot and calls whichever mutation(s) are needed.
 */
export function useSaveRoleMenuPermissions() {
  const { session } = useAuth();

  const refetchQueriesFor = (roleId: number, menuId: number) => [
    { query: GET_ROLE_MENU_PERMISSIONS, variables: { roleId, menuId } },
    { query: GET_AVAILABLE_PERMISSIONS_FOR_MENU, variables: { menuId } },
  ];

  const [addRoleMenuPermissionsMutation, { loading: adding }] = useMutation<
    AddRoleMenuPermissionsResult,
    { input: RoleMenuPermissionInput }
  >(ADD_ROLE_MENU_PERMISSIONS);

  const [removeRoleMenuPermissionsMutation, { loading: removing }] = useMutation<
    RemoveRoleMenuPermissionsResult,
    { input: RoleMenuPermissionInput }
  >(REMOVE_ROLE_MENU_PERMISSIONS);

  async function saveRoleMenuPermissions({
    roleId,
    menuId,
    originalPermissionIds,
    selectedPermissionIds,
  }: SaveRoleMenuPermissionsParams): Promise<boolean> {
    if (!session?.userId) {
      toast.error("You must be signed in to update role permissions.");
      return false;
    }

    const toAdd = selectedPermissionIds.filter((id) => !originalPermissionIds.includes(id));
    const toRemove = originalPermissionIds.filter((id) => !selectedPermissionIds.includes(id));

    if (toAdd.length === 0 && toRemove.length === 0) {
      return true;
    }

    const updatedBy = Number(session.userId);
    const refetchQueries = refetchQueriesFor(roleId, menuId);

    try {
      if (toAdd.length > 0) {
        await addRoleMenuPermissionsMutation({
          variables: { input: { roleId, menuId, permissionIds: toAdd, updatedBy } },
          refetchQueries,
        });
      }
      if (toRemove.length > 0) {
        await removeRoleMenuPermissionsMutation({
          variables: { input: { roleId, menuId, permissionIds: toRemove, updatedBy } },
          refetchQueries,
        });
      }
      toast.success("Role permissions updated successfully.");
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update role permissions.");
      return false;
    }
  }

  return { saveRoleMenuPermissions, saving: adding || removing };
}
