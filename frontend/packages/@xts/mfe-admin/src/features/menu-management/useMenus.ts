import { useQuery } from "@apollo/client";
import { GET_MENUS } from "./menu.queries";

// Matches the real backend's Menu type (menus.typeDefs.ts) exactly, minus
// the recursive `children` field which is never queried (see menu.queries.ts).
export interface Menu {
  menuId: number;
  menuName: string;
  menuKey: string;
  icon: string | null;
  parentId: number | null;
  sortOrder: number;
  createdDt: string;
  createdBy: number;
  updatedDt: string | null;
  updatedBy: number | null;
  isActive: boolean;
}

interface GetMenusResult {
  menus: Menu[];
}

export function useMenus() {
  const { data, loading, error, refetch } = useQuery<GetMenusResult>(GET_MENUS);

  return {
    menus: data?.menus ?? [],
    loading,
    error,
    refetch,
  };
}
