import { useMutation } from "@apollo/client";
import { toast } from "sonner";
import { useAuth } from "@xts/design-system";
import {
  GET_ALL_MENU_PERMISSION_MAPPINGS,
  GET_MENU_PERMISSIONS,
  SAVE_MENU_PERMISSIONS,
} from "./menuPermissionMapping.queries";
import type { MenuPermissionMappingPermission } from "./useMenuPermissions";

export interface MenuPermissionMappingInput {
  menuId: number;
  permissionIds: number[];
  updatedBy: number;
}

interface SaveMenuPermissionsResult {
  saveMenuPermissions: MenuPermissionMappingPermission[];
}

export interface SaveMenuPermissionsParams {
  menuId: number;
  /** The COMPLETE set of permissionIds that should be mapped to this menu — saveMenuPermissions replaces wholesale. */
  permissionIds: number[];
}

/**
 * saveMenuPermissions is a full-replace operation — the entire desired set
 * of permissionIds for the menu is sent every time, unlike
 * role-menu-permission-assignment's delta-based add/remove mutations.
 */
export function useSaveMenuPermissions() {
  const { session } = useAuth();

  const [saveMenuPermissionsMutation, { loading: saving }] = useMutation<
    SaveMenuPermissionsResult,
    { input: MenuPermissionMappingInput }
  >(SAVE_MENU_PERMISSIONS);

  async function saveMenuPermissions({ menuId, permissionIds }: SaveMenuPermissionsParams): Promise<boolean> {
    if (!session?.userId) {
      toast.error("You must be signed in to update menu permissions.");
      return false;
    }

    const updatedBy = Number(session.userId);

    try {
      await saveMenuPermissionsMutation({
        variables: { input: { menuId, permissionIds, updatedBy } },
        refetchQueries: [
          { query: GET_MENU_PERMISSIONS, variables: { menuId } },
          { query: GET_ALL_MENU_PERMISSION_MAPPINGS },
        ],
      });
      toast.success("Menu permissions updated successfully.");
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update menu permissions.");
      return false;
    }
  }

  return { saveMenuPermissions, saving };
}
