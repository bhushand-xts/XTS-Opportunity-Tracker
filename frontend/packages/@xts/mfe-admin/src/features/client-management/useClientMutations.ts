import { useMutation } from "@apollo/client";
import type { Client, ClientInput } from "@xts/api-contracts";
import { requireUserId, runWithToast } from "../../lib/mutation";
import { CREATE_CLIENT, DELETE_CLIENT, GET_CLIENTS, UPDATE_CLIENT } from "./client.queries";

type ClientDetails = Omit<ClientInput, "createdBy" | "updatedBy">;

export function useClientMutations() {
  const refetch = { refetchQueries: [GET_CLIENTS] };

  const [createMutation, { loading: creating }] = useMutation<{ createClient: Client }, { input: ClientInput }>(
    CREATE_CLIENT,
    refetch
  );
  const [updateMutation, { loading: updating }] = useMutation<
    { updateClient: Client },
    { id: number; input: Partial<ClientInput> }
  >(UPDATE_CLIENT, refetch);
  const [deleteMutation, { loading: deleting }] = useMutation<
    { deleteClient: boolean },
    { id: number; updatedBy: number }
  >(DELETE_CLIENT, refetch);

  // Every change is recorded against the signed-in user (created_by / updated_by).
  return {
    createClient: (details: ClientDetails) =>
      runWithToast(
        () => createMutation({ variables: { input: { ...details, createdBy: requireUserId() } } }),
        "Client added successfully.",
        "Failed to add client."
      ),
    updateClient: (id: number, details: ClientDetails) =>
      runWithToast(
        () => updateMutation({ variables: { id, input: { ...details, updatedBy: requireUserId() } } } ),
        "Client updated.",
        "Failed to update client."
      ),
    deleteClient: (id: number) =>
      runWithToast(
        () => deleteMutation({ variables: { id, updatedBy: requireUserId() } }),
        "Client deleted.",
        "Failed to delete client."
      ),
    // Grid's quick Active/Inactive switch — a partial update (just isActive,
    // contacts omitted so they're left untouched), reusing the same
    // mutation as the full edit form.
    setClientActive: (id: number, isActive: boolean) =>
      runWithToast(
        () => updateMutation({ variables: { id, input: { isActive, updatedBy: requireUserId() } } }),
        isActive ? "Client activated." : "Client deactivated.",
        "Failed to change client status."
      ),
    saving: creating || updating || deleting,
  };
}
