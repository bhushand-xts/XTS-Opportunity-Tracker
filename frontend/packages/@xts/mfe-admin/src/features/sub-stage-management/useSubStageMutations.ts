import { useMutation } from "@apollo/client";
import type { SubStage, SubStageInput } from "@xts/api-contracts";
import { requireUserId, runWithToast } from "../../lib/mutation";
import { CREATE_SUB_STAGE, GET_SUB_STAGES, UPDATE_SUB_STAGE } from "./subStage.queries";

type SubStageDetails = Omit<SubStageInput, "createdBy" | "updatedBy">;

export function useSubStageMutations() {
  const refetch = { refetchQueries: [GET_SUB_STAGES] };

  const [createMutation, { loading: creating }] = useMutation<
    { createSubStage: SubStage },
    { input: SubStageInput }
  >(CREATE_SUB_STAGE, refetch);

  const [updateMutation, { loading: updating }] = useMutation<
    { updateSubStage: SubStage },
    { id: number; input: Partial<SubStageInput> }
  >(UPDATE_SUB_STAGE, refetch);

  return {
    createSubStage: (details: SubStageDetails) =>
      runWithToast(
        () => createMutation({ variables: { input: { ...details, createdBy: requireUserId() } } }),
        "Sub stage added successfully.",
        "Failed to add sub stage."
      ),
    updateSubStage: (id: number, details: SubStageDetails) =>
      runWithToast(
        () => updateMutation({ variables: { id, input: { ...details, updatedBy: requireUserId() } } }),
        "Sub stage updated successfully.",
        "Failed to update sub stage."
      ),
    saving: creating || updating,
  };
}
