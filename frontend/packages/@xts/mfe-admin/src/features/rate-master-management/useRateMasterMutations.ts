import { useMutation } from "@apollo/client";
import type { RateMaster, RateMasterInput } from "@xts/api-contracts";
import { requireUserId, runWithToast } from "../../lib/mutation";
import {
  CREATE_RATE_MASTER,
  GET_RATE_MASTERS,
  TOGGLE_RATE_MASTER_STATUS,
  UPDATE_RATE_MASTER,
} from "./rateMaster.queries";

type RateMasterDetails = Omit<RateMasterInput, "createdBy" | "updatedBy">;

export function useRateMasterMutations() {
  const refetch = { refetchQueries: [GET_RATE_MASTERS] };

  const [createMutation, { loading: creating }] = useMutation<
    { createRateMaster: RateMaster },
    { input: RateMasterInput }
  >(CREATE_RATE_MASTER, refetch);

  const [updateMutation, { loading: updating }] = useMutation<
    { updateRateMaster: RateMaster },
    { ratemasterId: number; input: RateMasterInput }
  >(UPDATE_RATE_MASTER, refetch);

  const [toggleMutation, { loading: toggling }] = useMutation<
    { toggleRateMasterStatus: RateMaster },
    { ratemasterId: number; isActive: boolean; updatedBy: number }
  >(TOGGLE_RATE_MASTER_STATUS, refetch);

  return {
    createRateMaster: (details: RateMasterDetails) =>
      runWithToast(
        () =>
          createMutation({
            variables: {
              input: {
                ...details,
                createdBy: requireUserId(),
              },
            },
          }),
        "Rate master added successfully.",
        "Failed to add rate master."
      ),

    updateRateMaster: (
      ratemasterId: number,
      details: RateMasterDetails
    ) =>
      runWithToast(
        () =>
          updateMutation({
            variables: {
              ratemasterId,
              input: {
                ...details,
                updatedBy: requireUserId(),
              },
            },
          }),
        "Rate master updated successfully.",
        "Failed to update rate master."
      ),

    setRateMasterActive: (ratemasterId: number, isActive: boolean) =>
      runWithToast(
        () =>
          toggleMutation({
            variables: {
              ratemasterId,
              isActive,
              updatedBy: requireUserId(),
            },
          }),
        isActive ? "Rate master activated." : "Rate master deactivated.",
        "Failed to change rate master status."
      ),

    saving: creating || updating || toggling,
  };
}