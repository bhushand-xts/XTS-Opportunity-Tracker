import { useMutation } from "@apollo/client";
import type { Currency, CurrencyInput } from "@xts/api-contracts";
import { requireUserId, runWithToast } from "../../lib/mutation";
import {
  CREATE_CURRENCY,
  GET_CURRENCIES,
  TOGGLE_CURRENCY_STATUS,
  UPDATE_CURRENCY,
} from "./currency.queries";

type CurrencyDetails = Omit<CurrencyInput, "createdBy" | "updatedBy">;

export function useCurrencyMutations() {
  const refetch = { refetchQueries: [GET_CURRENCIES] };

  const [createMutation, { loading: creating }] = useMutation<
    { createCurrency: Currency },
    { input: CurrencyInput }
  >(CREATE_CURRENCY, refetch);

  const [updateMutation, { loading: updating }] = useMutation<
    { updateCurrency: Currency },
    { currencyId: number; input: CurrencyInput }
  >(UPDATE_CURRENCY, refetch);

  const [toggleMutation, { loading: toggling }] = useMutation<
    { toggleCurrencyStatus: Currency },
    { currencyId: number; isActive: boolean; updatedBy: number }
  >(TOGGLE_CURRENCY_STATUS, refetch);

  return {
    createCurrency: (details: CurrencyDetails) =>
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
        "Currency added successfully.",
        "Failed to add currency."
      ),

    updateCurrency: (currencyId: number, details: CurrencyDetails) =>
      runWithToast(
        () =>
          updateMutation({
            variables: {
              currencyId,
              input: {
                ...details,
                updatedBy: requireUserId(),
              },
            },
          }),
        "Currency updated successfully.",
        "Failed to update currency."
      ),

    setCurrencyActive: (currencyId: number, isActive: boolean) =>
      runWithToast(
        () =>
          toggleMutation({
            variables: {
              currencyId,
              isActive,
              updatedBy: requireUserId(),
            },
          }),
        isActive ? "Currency activated." : "Currency deactivated.",
        "Failed to change currency status."
      ),

    saving: creating || updating || toggling,
  };
}