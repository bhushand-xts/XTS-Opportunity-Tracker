import { useQuery } from "@apollo/client";
import type { Menu } from "@xts/api-contracts";
import { GET_MENUS } from "./menu.queries";

// The real backend's Menu type only has `id` today (see menu.queries.ts) —
// intentionally not the full `Menu` shape from @xts/api-contracts.
export type MenuListItem = Pick<Menu, "id">;

interface GetMenusResult {
  menusList: MenuListItem[];
}

export function useMenus() {
  const { data, loading, error, refetch } = useQuery<GetMenusResult>(GET_MENUS);

  return {
    menus: data?.menusList ?? [],
    loading,
    error,
    refetch,
  };
}
