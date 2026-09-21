import { useMutation } from "@apollo/client";
import { toast } from "sonner";
import { useAuth } from "@xts/design-system";
import { CREATE_MENU, GET_MENUS, TOGGLE_MENU_STATUS, UPDATE_MENU } from "./menu.queries";
import type { Menu } from "./useMenus";

export interface MenuFormInput {
  menuName: string;
  menuKey: string;
  icon: string | null;
  parentId: number | null;
  sortOrder: number;
}

interface CreateMenuResult {
  createMenu: Menu;
}
interface UpdateMenuResult {
  updateMenu: Menu;
}
interface ToggleMenuStatusResult {
  toggleMenuStatus: Menu;
}

export function useMenuMutations() {
  const { session } = useAuth();

  const [createMenuMutation, { loading: creating }] = useMutation<
    CreateMenuResult,
    { input: MenuFormInput & { createdBy: number } }
  >(CREATE_MENU, { refetchQueries: [GET_MENUS] });

  const [updateMenuMutation, { loading: updating }] = useMutation<
    UpdateMenuResult,
    { menuId: number; input: Partial<MenuFormInput> & { updatedBy: number } }
  >(UPDATE_MENU, { refetchQueries: [GET_MENUS] });

  const [toggleMenuStatusMutation, { loading: toggling }] = useMutation<
    ToggleMenuStatusResult,
    { menuId: number; isActive: boolean; updatedBy: number }
  >(TOGGLE_MENU_STATUS, { refetchQueries: [GET_MENUS] });

  async function createMenu(input: MenuFormInput): Promise<boolean> {
    if (!session?.userId) {
      toast.error("You must be signed in to add a menu.");
      return false;
    }
    try {
      await createMenuMutation({ variables: { input: { ...input, createdBy: Number(session.userId) } } });
      toast.success("Menu added successfully.");
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add menu.");
      return false;
    }
  }

  async function updateMenu(menuId: number, input: Partial<MenuFormInput>): Promise<boolean> {
    if (!session?.userId) {
      toast.error("You must be signed in to update a menu.");
      return false;
    }
    try {
      await updateMenuMutation({ variables: { menuId, input: { ...input, updatedBy: Number(session.userId) } } });
      toast.success("Menu updated successfully.");
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update menu.");
      return false;
    }
  }

  async function toggleMenuStatus(menuId: number, isActive: boolean): Promise<boolean> {
    if (!session?.userId) {
      toast.error("You must be signed in to change a menu's status.");
      return false;
    }
    try {
      await toggleMenuStatusMutation({ variables: { menuId, isActive, updatedBy: Number(session.userId) } });
      toast.success(`Menu ${isActive ? "activated" : "deactivated"} successfully.`);
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update menu status.");
      return false;
    }
  }

  return { createMenu, updateMenu, toggleMenuStatus, saving: creating || updating || toggling };
}
