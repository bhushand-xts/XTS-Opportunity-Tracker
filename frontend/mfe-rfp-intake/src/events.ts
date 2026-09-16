import { createDomainEvents } from "@xts/platform";

export const rfpIntakeEvents = createDomainEvents("rfp-intake", {
  // e.g. STAGE_CHANGED: "rfp-intake.stage-changed",
});
