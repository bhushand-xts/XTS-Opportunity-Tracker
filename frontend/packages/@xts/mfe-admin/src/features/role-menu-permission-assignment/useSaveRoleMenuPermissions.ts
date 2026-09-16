import { useMutation } from "@apollo/client";
import { toast } from "sonner";
import type { RoleMenuPermission, RoleMenuPermissionInput } from "@xts/api-contracts";
import { GET_ROLE_MENU_PERMISSIONS, SAVE_ROLE_MENU_PERMISSIONS } from "./roleMenuPermission.queries";

interface SaveRoleMenuPermissionsResult {
  saveRoleMenuPermissions: RoleMenuPermission[];
}

export function useSaveRoleMenuPermissions() {
  const [saveMutation, { loading: saving }] = useMutation<
    SaveRoleMenuPermissionsResult,
    { roleId: string; entries: RoleMenuPermissionInput[] }
  >(SAVE_ROLE_MENU_PERMISSIONS);

  async function saveRoleMenuPermissions(
    roleId: string,
    entries: RoleMenuPermissionInput[],
    hadExistingEntries: boolean
  ): Promise<boolean> {
    try {
      await saveMutation({
        variables: { roleId, entries },
        // This role's mapping is keyed by roleId, not normalized by Apollo's
        // default id/_id convention, so refetch explicitly rather than
        // relying on cache identity to pick up the change.
        refetchQueries: [{ query: GET_ROLE_MENU_PERMISSIONS, variables: { roleId } }],
      });
      toast.success(
        hadExistingEntries ? "Role permissions updated successfully." : "Role permissions assigned successfully."
      );
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save role permissions.");
      return false;
    }
  }

  return { saveRoleMenuPermissions, saving };
}
