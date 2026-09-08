import { createDomainEvents } from "@xts/platform";

export const opportunityPipelineEvents = createDomainEvents("opportunity-pipeline", {
  // e.g. STAGE_CHANGED: "opportunity-pipeline.stage-changed",
});
