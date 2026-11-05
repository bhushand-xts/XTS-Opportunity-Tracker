// Mirrors the admin service's `Menu` type
// (backend/services/admin/src/graphql/typeDefs/menus.typeDefs.ts).
// A menu with no `parentId` is a top-level menu; otherwise it is a submenu.

export interface Menu {
  menuId: number;
  menuName: string;
  menuKey: string;
  icon: string | null;
  parentId: number | null;
  sortOrder: number;
  /** The frontend route this menu links to, e.g. "/admin/user-management/role-master". */
  routePath: string | null;
  isActive: boolean;
  createdDt: string;
  createdBy: number;
  updatedDt: string | null;
  updatedBy: number | null;
}

export interface CreateMenuInput {
  menuName: string;
  menuKey: string;
  icon?: string | null;
  parentId?: number | null;
  sortOrder: number;
  routePath?: string | null;
  createdBy: number;
}

export interface UpdateMenuInput {
  menuName?: string;
  menuKey?: string;
  icon?: string | null;
  parentId?: number | null;
  sortOrder?: number;
  routePath?: string | null;
  updatedBy: number;
}
