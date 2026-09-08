import { createDomainEvents } from "@xts/platform";

export const documentsEvents = createDomainEvents("documents", {
  // e.g. STAGE_CHANGED: "documents.stage-changed",
});
