import { useMutation } from "@apollo/client";
import type { RfpQuestion, RfpQuestionInput } from "@xts/api-contracts";
import { requireUserId, runWithToast } from "../../lib/mutation";
import { CREATE_RFP_QUESTION, GET_RFP_QUESTIONS, UPDATE_RFP_QUESTION } from "./rfpQuestion.queries";

type RfpQuestionDetails = Omit<RfpQuestionInput, "createdBy" | "updatedBy">;

export function useRfpQuestionMutations() {
  const refetch = { refetchQueries: [GET_RFP_QUESTIONS] };

  const [createMutation, { loading: creating }] = useMutation<
    { createRfpQuestion: RfpQuestion },
    { input: RfpQuestionInput }
  >(CREATE_RFP_QUESTION, refetch);
  const [updateMutation, { loading: updating }] = useMutation<
    { updateRfpQuestion: RfpQuestion },
    { id: number; input: Partial<RfpQuestionInput> }
  >(UPDATE_RFP_QUESTION, refetch);

  // Every change is recorded against the signed-in user (created_by / updated_by).
  return {
    createRfpQuestion: (details: RfpQuestionDetails) =>
      runWithToast(
        () => createMutation({ variables: { input: { ...details, createdBy: requireUserId() } } }),
        "RFP question added successfully.",
        "Failed to add RFP question."
      ),
    updateRfpQuestion: (id: number, details: RfpQuestionDetails) =>
      runWithToast(
        () => updateMutation({ variables: { id, input: { ...details, updatedBy: requireUserId() } } }),
        "RFP question updated.",
        "Failed to update RFP question."
      ),
    setQuestionActive: (id: number, isActive: boolean) =>
      runWithToast(
        () => updateMutation({ variables: { id, input: { isActive, updatedBy: requireUserId() } } }),
        isActive ? "RFP question activated." : "RFP question deactivated.",
        "Failed to change RFP question status."
      ),
    saving: creating || updating,
  };
}
