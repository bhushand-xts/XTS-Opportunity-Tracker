// Composed pattern, not a primitive: built from tokens rather than
// hard-coded colors, and named after the pipeline's own stage vocabulary
// so every MFE that shows a stage (Opportunity & Pipeline, Approvals &
// Gates, Reporting) renders it identically.

import { cn } from "../lib/utils";

export type Stage =
  | "identified"
  | "scoping"
  | "estimation"
  | "negotiation"
  | "won"
  | "lost"
  | "hold";

const LABEL: Record<Stage, string> = {
  identified: "Identified",
  scoping: "Solution & Scoping",
  estimation: "Estimation",
  negotiation: "Negotiation",
  won: "Won",
  lost: "Lost",
  hold: "On Hold",
};

export function StageBadge({ stage }: { stage: Stage }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
      )}
      style={{ backgroundColor: `var(--xts-stage-${stage})` }}
    >
      {LABEL[stage]}
    </span>
  );
}
