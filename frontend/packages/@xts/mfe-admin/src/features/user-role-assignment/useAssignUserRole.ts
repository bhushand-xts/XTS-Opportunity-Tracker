import { useMutation } from "@apollo/client";
import type { ManagedUser } from "@xts/api-contracts";
import { requireUserId, runWithToast } from "../../lib/mutation";
import { ASSIGN_USER_ROLE } from "./userRole.queries";

export function useAssignUserRole() {
  const [mutate, { loading }] = useMutation<
    { assignUserRole: ManagedUser },
    { userId: number; roleId: number | null; updatedBy: number }
  >(ASSIGN_USER_ROLE);

  return {
    // roleId null removes the user's role. The updated user replaces the cached one,
    // so the table updates without a refetch.
    assignRole: (userId: number, roleId: number | null, successMessage: string) =>
      runWithToast(
        () => mutate({ variables: { userId, roleId, updatedBy: requireUserId() } }),
        successMessage,
        "Failed to update the user's role."
      ),
    saving: loading,
  };
}
