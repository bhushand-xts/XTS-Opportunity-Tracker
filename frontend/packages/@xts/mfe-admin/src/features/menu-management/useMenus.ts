import { useQuery } from "@apollo/client";
import type { Menu } from "@xts/api-contracts";
import { GET_MENUS } from "./menu.queries";

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
