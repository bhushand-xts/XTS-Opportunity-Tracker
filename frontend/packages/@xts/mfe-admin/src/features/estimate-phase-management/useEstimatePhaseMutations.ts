import { useMutation } from "@apollo/client";
import type { EstimationPhase, EstimationPhaseInput } from "@xts/api-contracts";
import { requireUserId, runWithToast } from "../../lib/mutation";
import {
  CREATE_ESTIMATION_PHASE,
  DELETE_ESTIMATION_PHASE,
  GET_ESTIMATION_PHASES,
  UPDATE_ESTIMATION_PHASE,
} from "./estimatePhase.queries";

type EstimatePhaseDetails = Omit<EstimationPhaseInput, "createdBy" | "updatedBy">;

export function useEstimatePhaseMutations() {
  const refetch = { refetchQueries: [GET_ESTIMATION_PHASES] };

  const [createMutation, { loading: creating }] = useMutation<
    { createEstimationPhase: EstimationPhase },
    { input: EstimationPhaseInput }
  >(CREATE_ESTIMATION_PHASE, refetch);
  const [updateMutation, { loading: updating }] = useMutation<
    { updateEstimationPhase: EstimationPhase },
    { id: number; input: Partial<EstimationPhaseInput> }
  >(UPDATE_ESTIMATION_PHASE, refetch);
  const [deleteMutation, { loading: deleting }] = useMutation<
    { deleteEstimationPhase: boolean },
    { id: number; updatedBy: number }
  >(DELETE_ESTIMATION_PHASE, refetch);

  // Every change is recorded against the signed-in user (created_by / updated_by).
  return {
    createEstimatePhase: (details: EstimatePhaseDetails) =>
      runWithToast(
        () => createMutation({ variables: { input: { ...details, createdBy: requireUserId() } } }),
        "Estimate phase added successfully.",
        "Failed to add estimate phase."
      ),
    updateEstimatePhase: (id: number, details: EstimatePhaseDetails) =>
      runWithToast(
        () => updateMutation({ variables: { id, input: { ...details, updatedBy: requireUserId() } } }),
        "Estimate phase updated.",
        "Failed to update estimate phase."
      ),
    deleteEstimatePhase: (id: number) =>
      runWithToast(
        () => deleteMutation({ variables: { id, updatedBy: requireUserId() } }),
        "Estimate phase deleted.",
        "Failed to delete estimate phase."
      ),
    saving: creating || updating || deleting,
  };
}
