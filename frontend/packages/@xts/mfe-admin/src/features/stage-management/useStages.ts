import { useQuery } from "@apollo/client";
import type { Stage } from "@xts/api-contracts";
import { GET_STAGES } from "./stage.queries";

export function useStages() {
  const { data, loading, error } = useQuery<{ stagesList: Stage[] }>(GET_STAGES, {
    fetchPolicy: "cache-and-network",
  });

  return {
    stages: data?.stagesList ?? [],
    loading: loading && data === undefined,
    error,
  };
}
