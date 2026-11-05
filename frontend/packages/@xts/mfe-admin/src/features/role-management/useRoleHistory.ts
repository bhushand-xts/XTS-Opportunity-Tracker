import { useQuery } from "@apollo/client";
import type { RoleHistory } from "@xts/api-contracts";
import { GET_ROLE_HISTORY } from "./role.queries";

/** A role's change history. Fetched fresh each time the dialog opens. */
export function useRoleHistory(roleId: number | undefined) {
  const { data, loading, error } = useQuery<{ roleHistory: RoleHistory[] }>(GET_ROLE_HISTORY, {
    variables: { roleId },
    skip: roleId === undefined,
    fetchPolicy: "network-only",
  });

  return { history: data?.roleHistory ?? [], loading, error };
}
