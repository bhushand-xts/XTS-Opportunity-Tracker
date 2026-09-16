import { useMutation } from "@apollo/client";
import { toast } from "sonner";
import type { Menu, MenuInput } from "@xts/api-contracts";
import { CREATE_MENU, GET_MENUS, UPDATE_MENU } from "./menu.queries";

interface CreateMenuResult {
  createMenu: Menu;
}
interface UpdateMenuResult {
  updateMenu: Menu;
}

export function useMenuMutations() {
  const [createMenuMutation, { loading: creating }] = useMutation<CreateMenuResult, { input: MenuInput }>(
    CREATE_MENU,
    { refetchQueries: [GET_MENUS] }
  );
  const [updateMenuMutation, { loading: updating }] = useMutation<
    UpdateMenuResult,
    { id: string; input: MenuInput }
  >(UPDATE_MENU, { refetchQueries: [GET_MENUS] });

  async function createMenu(input: MenuInput): Promise<boolean> {
    try {
      await createMenuMutation({ variables: { input } });
      toast.success("Menu added successfully.");
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add menu.");
      return false;
    }
  }

  async function updateMenu(id: string, input: MenuInput): Promise<boolean> {
    try {
      await updateMenuMutation({ variables: { id, input } });
      toast.success("Menu updated successfully.");
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update menu.");
      return false;
    }
  }

  return { createMenu, updateMenu, saving: creating || updating };
}
