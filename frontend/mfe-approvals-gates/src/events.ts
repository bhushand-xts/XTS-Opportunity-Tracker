import { createDomainEvents } from "@xts/platform";

export const approvalsGatesEvents = createDomainEvents("approvals-gates", {
  // e.g. STAGE_CHANGED: "approvals-gates.stage-changed",
});
