import { useQuery } from "@apollo/client";
import { GET_ALL_MENU_PERMISSION_MAPPINGS } from "./menuPermissionMapping.queries";

export interface MenuPermissionMappingRow {
  id: number;
  menuId: number;
  permissionId: number;
  menuName: string;
  permissionName: string;
  permissionKey: string;
}

interface GetAllMenuPermissionMappingsResult {
  menuPermissionMappings: MenuPermissionMappingRow[];
}

export function useAllMenuPermissionMappings() {
  const { data, loading, error, refetch } = useQuery<GetAllMenuPermissionMappingsResult>(
    GET_ALL_MENU_PERMISSION_MAPPINGS
  );

  return {
    mappings: data?.menuPermissionMappings ?? [],
    loading,
    error,
    refetch,
  };
}
