import { useQuery } from "@apollo/client";
import type { SubStage } from "@xts/api-contracts";
import { GET_SUB_STAGES } from "./subStage.queries";

export function useSubStages() {
  const { data, loading, error } = useQuery<{ subStagesList: SubStage[] }>(GET_SUB_STAGES, {
    fetchPolicy: "cache-and-network",
  });

  return {
    subStages: data?.subStagesList ?? [],
    loading: loading && data === undefined,
    error,
  };
}
