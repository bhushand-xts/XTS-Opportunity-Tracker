export type MenuType = "MAIN_MENU" | "SUB_MENU";

export interface Menu {
  id: string;
  menuName: string;
  menuType: MenuType;
  parentMenuId: string | null;
  icon: string | null;
  displayOrder: number;
  menuKey: string;
  isActive: boolean;
}

export interface MenuInput {
  menuName: string;
  menuType: MenuType;
  parentMenuId: string | null;
  icon: string | null;
  displayOrder: number;
  isActive: boolean;
}
