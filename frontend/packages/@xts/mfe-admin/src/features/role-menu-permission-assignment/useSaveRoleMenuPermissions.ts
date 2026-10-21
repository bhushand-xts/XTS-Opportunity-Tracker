import { useMutation } from "@apollo/client";
import type { RoleMenuPermissionInput } from "@xts/api-contracts";
import { requireUserId, runWithToast } from "../../lib/mutation";
import { ADD_ROLE_MENU_PERMISSIONS, GET_ROLE_ACCESS, REMOVE_ROLE_MENU_PERMISSIONS } from "./roleMenuPermission.queries";

/** What changes for one menu: permissions to grant and permissions to revoke. */
export interface MenuChange {
  menuId: number;
  add: number[];
  remove: number[];
}

type Variables = { input: RoleMenuPermissionInput };

export function useSaveRoleMenuPermissions() {
  const refetch = { refetchQueries: [GET_ROLE_ACCESS], awaitRefetchQueries: true };
  const [addMutation, { loading: adding }] = useMutation<unknown, Variables>(ADD_ROLE_MENU_PERMISSIONS, refetch);
  const [removeMutation, { loading: removing }] = useMutation<unknown, Variables>(
    REMOVE_ROLE_MENU_PERMISSIONS,
    refetch
  );

  // The backend takes one menu per call and rejects an empty permission list,
  // so send only the non-empty adds/removes, one menu after another.
  const save = (roleId: number, changes: MenuChange[]) =>
    runWithToast(
      async () => {
        const updatedBy = requireUserId();
        for (const { menuId, add, remove } of changes) {
          if (add.length) await addMutation({ variables: { input: { roleId, menuId, permissionIds: add, updatedBy } } });
          if (remove.length) {
            await removeMutation({ variables: { input: { roleId, menuId, permissionIds: remove, updatedBy } } });
          }
        }
      },
      "Access saved for this role.",
      "Failed to save access."
    );

  return { save, saving: adding || removing };
}
