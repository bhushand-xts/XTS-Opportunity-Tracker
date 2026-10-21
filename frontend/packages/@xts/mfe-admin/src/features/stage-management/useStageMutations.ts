import { useMutation } from "@apollo/client";
import type { Stage, StageInput } from "@xts/api-contracts";
import { requireUserId, runWithToast } from "../../lib/mutation";
import { CREATE_STAGE, GET_STAGES, UPDATE_STAGE } from "./stage.queries";

type StageDetails = Omit<StageInput, "createdBy" | "updatedBy">;

export function useStageMutations() {
  const refetch = { refetchQueries: [GET_STAGES] };

  const [createMutation, { loading: creating }] = useMutation<
    { createStage: Stage },
    { input: StageInput }
  >(CREATE_STAGE, refetch);

  const [updateMutation, { loading: updating }] = useMutation<
    { updateStage: Stage },
    { id: number; input: Partial<StageInput> }
  >(UPDATE_STAGE, refetch);

  return {
    createStage: (details: StageDetails) =>
      runWithToast(
        () => createMutation({ variables: { input: { ...details, createdBy: requireUserId() } } }),
        "Stage added successfully.",
        "Failed to add stage."
      ),
    updateStage: (id: number, details: StageDetails) =>
      runWithToast(
        () => updateMutation({ variables: { id, input: { ...details, updatedBy: requireUserId() } } }),
        "Stage updated successfully.",
        "Failed to update stage."
      ),
    saving: creating || updating,
  };
}
