import { useMutation } from "@apollo/client";
import type { ReasonCode, ReasonCodeInput } from "@xts/api-contracts";
import { requireUserId, runWithToast } from "../../lib/mutation";
import {
  CREATE_REASON_CODE,
  DELETE_REASON_CODE,
  GET_REASON_CODES,
  UPDATE_REASON_CODE,
} from "./reasonCode.queries";

type ReasonCodeDetails = Omit<ReasonCodeInput, "createdBy" | "updatedBy">;

export function useReasonCodeMutations() {
  const refetch = { refetchQueries: [GET_REASON_CODES] };

  const [createMutation, { loading: creating }] = useMutation<
    { createReasonCode: ReasonCode },
    { input: ReasonCodeInput }
  >(CREATE_REASON_CODE, refetch);
  const [updateMutation, { loading: updating }] = useMutation<
    { updateReasonCode: ReasonCode },
    { id: number; input: Partial<ReasonCodeInput> }
  >(UPDATE_REASON_CODE, refetch);
  const [deleteMutation, { loading: deleting }] = useMutation<
    { deleteReasonCode: boolean },
    { id: number; updatedBy: number }
  >(DELETE_REASON_CODE, refetch);

  // Every change is recorded against the signed-in user (created_by / updated_by).
  return {
    createReasonCode: (details: ReasonCodeDetails) =>
      runWithToast(
        () => createMutation({ variables: { input: { ...details, createdBy: requireUserId() } } }),
        "Reason code added successfully.",
        "Failed to add reason code."
      ),
    updateReasonCode: (id: number, details: ReasonCodeDetails) =>
      runWithToast(
        () => updateMutation({ variables: { id, input: { ...details, updatedBy: requireUserId() } } }),
        "Reason code updated.",
        "Failed to update reason code."
      ),
    deleteReasonCode: (id: number) =>
      runWithToast(
        () => deleteMutation({ variables: { id, updatedBy: requireUserId() } }),
        "Reason code deleted.",
        "Failed to delete reason code."
      ),
    saving: creating || updating || deleting,
  };
}
