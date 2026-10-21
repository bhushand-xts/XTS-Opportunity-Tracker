import { useMutation } from "@apollo/client";
import type { Industry, IndustryInput } from "@xts/api-contracts";
import { requireUserId, runWithToast } from "../../lib/mutation";
import {
  CREATE_INDUSTRY,
  GET_INDUSTRIES,
  TOGGLE_INDUSTRY_STATUS,
  UPDATE_INDUSTRY,
} from "./industry.queries";

type IndustryDetails = Omit<IndustryInput, "createdBy" | "updatedBy">;

export function useIndustryMutations() {
  const refetch = { refetchQueries: [GET_INDUSTRIES] };

  const [createMutation, { loading: creating }] = useMutation<
    { createIndustry: Industry },
    { input: IndustryInput }
  >(CREATE_INDUSTRY, refetch);

  const [updateMutation, { loading: updating }] = useMutation<
    { updateIndustry: Industry },
    { industryId: number; input: IndustryInput }
  >(UPDATE_INDUSTRY, refetch);

  const [toggleMutation, { loading: toggling }] = useMutation<
    { toggleIndustryStatus: Industry },
    { industryId: number; isActive: boolean; updatedBy: number }
  >(TOGGLE_INDUSTRY_STATUS, refetch);

  return {
    createIndustry: (details: IndustryDetails) =>
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
        "Industry added successfully.",
        "Failed to add industry."
      ),

    updateIndustry: (industryId: number, details: IndustryDetails) =>
      runWithToast(
        () =>
          updateMutation({
            variables: {
              industryId,
              input: {
                ...details,
                updatedBy: requireUserId(),
              },
            },
          }),
        "Industry updated successfully.",
        "Failed to update industry."
      ),

    setIndustryActive: (industryId: number, isActive: boolean) =>
      runWithToast(
        () =>
          toggleMutation({
            variables: {
              industryId,
              isActive,
              updatedBy: requireUserId(),
            },
          }),
        isActive ? "Industry activated." : "Industry deactivated.",
        "Failed to change industry status."
      ),

    saving: creating || updating || toggling,
  };
}
