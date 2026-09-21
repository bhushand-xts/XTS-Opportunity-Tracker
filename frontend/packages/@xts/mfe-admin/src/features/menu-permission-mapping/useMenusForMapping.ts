import { useQuery } from "@apollo/client";
import { GET_MENUS_FOR_MAPPING } from "./menuPermissionMapping.queries";

// Matches the real backend's MenuForPermissionMapping type
// (permissions.typeDefs.ts) exactly.
export interface MenuForPermissionMapping {
  menuId: number;
  menuName: string;
}

interface GetMenusForMappingResult {
  menusForPermissionMapping: MenuForPermissionMapping[];
}

/**
 * Thin read hook for the menu selector on the Menu Permission Mapping page.
 */
export function useMenusForMapping() {
  const { data, loading, error } = useQuery<GetMenusForMappingResult>(GET_MENUS_FOR_MAPPING);

  return {
    menus: data?.menusForPermissionMapping ?? [],
    loading,
    error,
  };
}
