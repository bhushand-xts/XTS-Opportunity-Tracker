import { useMutation } from "@apollo/client";
import type { Role, RoleInput } from "@xts/api-contracts";
import { requireUserId, runWithToast } from "../../lib/mutation";
import { CREATE_ROLE, DELETE_ROLE, GET_ROLES, UPDATE_ROLE } from "./role.queries";

type RoleDetails = Omit<RoleInput, "createdBy" | "updatedBy">;

export function useRoleMutations() {
  const refetch = { refetchQueries: [GET_ROLES] };

  const [createMutation, { loading: creating }] = useMutation<{ createRole: Role }, { input: RoleInput }>(
    CREATE_ROLE,
    refetch
  );
  const [updateMutation, { loading: updating }] = useMutation<
    { updateRole: Role },
    { id: number; input: Partial<RoleInput> }
  >(UPDATE_ROLE, refetch);
  const [deleteMutation, { loading: deleting }] = useMutation<
    { deleteRole: boolean },
    { id: number; updatedBy: number }
  >(DELETE_ROLE, refetch);

  // Every change is recorded against the signed-in user (created_by / updated_by).
  return {
    createRole: (details: RoleDetails) =>
      runWithToast(
        () => createMutation({ variables: { input: { ...details, createdBy: requireUserId() } } }),
        "Role added.",
        "Failed to add role."
      ),
    updateRole: (id: number, details: RoleDetails) =>
      runWithToast(
        () => updateMutation({ variables: { id, input: { ...details, updatedBy: requireUserId() } } }),
        "Role updated.",
        "Failed to update role."
      ),
    deleteRole: (id: number) =>
      runWithToast(
        () => deleteMutation({ variables: { id, updatedBy: requireUserId() } }),
        "Role deleted.",
        "Failed to delete role."
      ),
    saving: creating || updating || deleting,
  };
}
