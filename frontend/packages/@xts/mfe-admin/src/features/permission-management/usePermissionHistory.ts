import { useQuery } from "@apollo/client";
import type { PermissionHistory } from "@xts/api-contracts";
import { GET_PERMISSION_HISTORY } from "./permission.queries";

/** A permission's change history. Fetched fresh each time the dialog opens. */
export function usePermissionHistory(permissionId: number | undefined) {
  const { data, loading, error } = useQuery<{ permissionHistory: PermissionHistory[] }>(GET_PERMISSION_HISTORY, {
    variables: { permissionId },
    skip: permissionId === undefined,
    fetchPolicy: "network-only",
  });

  return { history: data?.permissionHistory ?? [], loading, error };
}
