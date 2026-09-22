import { useMemo } from "react";
import { useQuery } from "@apollo/client";
import type { RoleMenuPermission } from "@xts/api-contracts";
import { GET_ROLE_ACCESS } from "./roleMenuPermission.queries";

type Grant = Pick<RoleMenuPermission, "id" | "roleId" | "menuId" | "permissionId">;

/** Identifies one grant — "this menu, this permission" — as a Set-friendly key. */
export function grantKey(menuId: number, permissionId: number): string {
  return `${menuId}:${permissionId}`;
}

/** The grants a role currently holds, as a set of {@link grantKey}s. */
export function useRoleMenuPermissions(roleId: number | undefined) {
  const { data, loading, error } = useQuery<{ roleAccess: Grant[] }>(GET_ROLE_ACCESS, {
    variables: { roleId },
    skip: roleId === undefined,
    // A role's grants change from other screens too — always read the latest.
    fetchPolicy: "network-only",
  });

  const granted = useMemo(
    () => new Set((data?.roleAccess ?? []).map((g) => grantKey(g.menuId, g.permissionId))),
    [data]
  );

  return { granted, loading, error };
}
