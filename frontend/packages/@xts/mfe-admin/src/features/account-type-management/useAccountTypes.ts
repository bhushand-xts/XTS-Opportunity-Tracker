import { useQuery } from "@apollo/client";
import type { AccountType } from "@xts/api-contracts";
import { GET_ACCOUNT_TYPES } from "./accountType.queries";

export function useAccountTypes() {
  const { data, loading, error } = useQuery<{ accountTypes: AccountType[] }>(
    GET_ACCOUNT_TYPES,
    { fetchPolicy: "cache-and-network" }
  );

  return {
    accountTypes: data?.accountTypes ?? [],
    loading: loading && data === undefined,
    error,
  };
}
