import { createDomainEvents } from "@xts/platform";

export const estimationRatesEvents = createDomainEvents("estimation-rates", {
  // e.g. STAGE_CHANGED: "estimation-rates.stage-changed",
});
