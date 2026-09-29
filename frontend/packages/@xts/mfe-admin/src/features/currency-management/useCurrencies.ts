import { useQuery } from "@apollo/client";
import type { Currency } from "@xts/api-contracts";
import { GET_CURRENCIES } from "./currency.queries";

export function useCurrencies() {
  const { data, loading, error } = useQuery<{ currencies: Currency[] }>(
    GET_CURRENCIES,
    { fetchPolicy: "cache-and-network" }
  );

  return {
    currencies: data?.currencies ?? [],
    loading: loading && data === undefined,
    error,
  };
}