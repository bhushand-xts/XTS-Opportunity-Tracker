import * as React from "react"

import { cn } from "@/lib/utils"

export interface SegmentedProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Number of filled segments (0..max). */
  value: number
  /** Total number of segments (workflow steps). */
  max: number
  /** Colour of the filled segments, e.g. "bg-progress-3" or "bg-destructive". */
  indicatorClassName?: string
}

/** A stepped progress bar: one segment per workflow step, filled up to the current step. */
const SegmentedProgress = React.forwardRef<HTMLDivElement, SegmentedProgressProps>(
  ({ value, max, indicatorClassName = "bg-primary", className, ...props }, ref) => {
    const filled = Math.max(0, Math.min(value, max))
    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={filled}
        className={cn("grid gap-0.5", className)}
        style={{ gridTemplateColumns: `repeat(${max}, minmax(0, 1fr))` }}
        {...props}
      >
        {Array.from({ length: max }, (_, i) => (
          <span key={i} className={cn("h-[3px] rounded-full", i < filled ? indicatorClassName : "bg-muted")} />
        ))}
      </div>
    )
  }
)
SegmentedProgress.displayName = "SegmentedProgress"

export { SegmentedProgress }
