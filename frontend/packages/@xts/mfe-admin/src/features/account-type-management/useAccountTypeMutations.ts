import { useMutation } from "@apollo/client";
import type { AccountType, AccountTypeInput } from "@xts/api-contracts";
import { requireUserId, runWithToast } from "../../lib/mutation";
import {
  CREATE_ACCOUNT_TYPE,
  GET_ACCOUNT_TYPES,
  TOGGLE_ACCOUNT_TYPE_STATUS,
  UPDATE_ACCOUNT_TYPE,
} from "./accountType.queries";

type AccountTypeDetails = Omit<AccountTypeInput, "createdBy" | "updatedBy">;

export function useAccountTypeMutations() {
  const refetch = { refetchQueries: [GET_ACCOUNT_TYPES] };

  const [createMutation, { loading: creating }] = useMutation<
    { createAccountType: AccountType },
    { input: AccountTypeInput }
  >(CREATE_ACCOUNT_TYPE, refetch);

  const [updateMutation, { loading: updating }] = useMutation<
    { updateAccountType: AccountType },
    { accountTypeId: number; input: AccountTypeInput }
  >(UPDATE_ACCOUNT_TYPE, refetch);

  const [toggleMutation, { loading: toggling }] = useMutation<
    { toggleAccountTypeStatus: AccountType },
    { accountTypeId: number; isActive: boolean; updatedBy: number }
  >(TOGGLE_ACCOUNT_TYPE_STATUS, refetch);

  return {
    createAccountType: (details: AccountTypeDetails) =>
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
        "Account type added successfully.",
        "Failed to add account type."
      ),

    updateAccountType: (accountTypeId: number, details: AccountTypeDetails) =>
      runWithToast(
        () =>
          updateMutation({
            variables: {
              accountTypeId,
              input: {
                ...details,
                updatedBy: requireUserId(),
              },
            },
          }),
        "Account type updated successfully.",
        "Failed to update account type."
      ),

    setAccountTypeActive: (accountTypeId: number, isActive: boolean) =>
      runWithToast(
        () =>
          toggleMutation({
            variables: {
              accountTypeId,
              isActive,
              updatedBy: requireUserId(),
            },
          }),
        isActive ? "Account type activated." : "Account type deactivated.",
        "Failed to change account type status."
      ),

    saving: creating || updating || toggling,
  };
}
