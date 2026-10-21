import { useMutation } from "@apollo/client";
import type { CreateMenuInput, Menu, UpdateMenuInput } from "@xts/api-contracts";
import { requireUserId, runWithToast } from "../../lib/mutation";
import { CREATE_MENU, GET_MENUS, TOGGLE_MENU_STATUS, UPDATE_MENU } from "./menu.queries";

type MenuDetails = Omit<CreateMenuInput, "createdBy">;

export function useMenuMutations() {
  const refetch = { refetchQueries: [GET_MENUS] };

  const [createMutation, { loading: creating }] = useMutation<{ createMenu: Menu }, { input: CreateMenuInput }>(
    CREATE_MENU,
    refetch
  );
  const [updateMutation, { loading: updating }] = useMutation<
    { updateMenu: Menu },
    { menuId: number; input: UpdateMenuInput }
  >(UPDATE_MENU, refetch);
  const [toggleMutation, { loading: toggling }] = useMutation<
    { toggleMenuStatus: Menu },
    { menuId: number; isActive: boolean; updatedBy: number }
  >(TOGGLE_MENU_STATUS, refetch);

  return {
    createMenu: (details: MenuDetails) =>
      runWithToast(
        () => createMutation({ variables: { input: { ...details, createdBy: requireUserId() } } }),
        "Menu added.",
        "Failed to add menu."
      ),
    updateMenu: (menuId: number, details: MenuDetails) =>
      runWithToast(
        () => updateMutation({ variables: { menuId, input: { ...details, updatedBy: requireUserId() } } }),
        "Menu updated.",
        "Failed to update menu."
      ),
    setMenuActive: (menuId: number, isActive: boolean) =>
      runWithToast(
        () => toggleMutation({ variables: { menuId, isActive, updatedBy: requireUserId() } }),
        isActive ? "Menu activated." : "Menu deactivated.",
        "Failed to change menu status."
      ),
    saving: creating || updating || toggling,
  };
}
