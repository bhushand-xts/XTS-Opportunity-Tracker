import * as React from "react"
import { Cell, Pie, PieChart } from "recharts"

import { cn } from "@/lib/utils"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "./chart"

export interface DonutChartDatum {
  key: string
  label: string
  value: number
  color: string
}

export interface DonutChartProps extends React.HTMLAttributes<HTMLDivElement> {
  data: DonutChartDatum[]
  /** Defaults to the sum of `data[].value`. */
  total?: number
  /** Formats the centered total (e.g. as currency). Defaults to the raw number. */
  formatTotal?: (value: number) => React.ReactNode
  /** Formats each segment's value in the hover tooltip. Defaults to the raw number. */
  formatValue?: (value: number) => React.ReactNode
  centerLabel?: string
  /** Shown instead of the ring when every value is zero. */
  emptyLabel?: string
}

/** A small donut (ring) chart with the total centered inside it — built on the
 * existing recharts-backed ChartContainer so every consumer shares one theme. */
const DonutChart = React.forwardRef<HTMLDivElement, DonutChartProps>(
  ({ data, total, formatTotal, formatValue, centerLabel, emptyLabel = "No data", className, ...props }, ref) => {
    const sum = total ?? data.reduce((acc, item) => acc + item.value, 0)
    const config: ChartConfig = Object.fromEntries(
      data.map((item) => [item.key, { label: item.label, color: item.color }])
    )

    return (
      <div ref={ref} className={cn("relative mx-auto w-full max-w-[180px]", className)} {...props}>
        {sum > 0 ? (
          <ChartContainer config={config} className="mx-auto aspect-square max-h-[180px]">
            <PieChart>
              {/* zIndex lifts the tooltip above the centered total, which is
                  an absolutely positioned sibling painted after the chart. */}
              <ChartTooltip
                wrapperStyle={{ zIndex: 20 }}
                content={
                  <ChartTooltipContent
                    hideLabel
                    nameKey="label"
                    formatter={(value, name, item) => (
                      <div className="flex w-full items-center justify-between gap-4">
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <span
                            className="size-2.5 shrink-0 rounded-[2px]"
                            style={{ backgroundColor: item.payload?.color ?? item.color }}
                            aria-hidden="true"
                          />
                          {item.payload?.label ?? name}
                        </span>
                        <span className="font-semibold tabular-nums text-foreground">
                          {formatValue ? formatValue(Number(value)) : Number(value).toLocaleString()}
                        </span>
                      </div>
                    )}
                  />
                }
              />
              <Pie
                data={data}
                dataKey="value"
                nameKey="label"
                innerRadius="65%"
                outerRadius="100%"
                paddingAngle={data.filter((item) => item.value > 0).length > 1 ? 3 : 0}
                strokeWidth={2}
                isAnimationActive
                animationDuration={700}
                animationEasing="ease-out"
              >
                {data.map((item) => (
                  <Cell key={item.key} fill={item.color} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
        ) : (
          <div className="mx-auto flex aspect-square max-h-[180px] items-center justify-center rounded-full border-8 border-muted">
            <span className="px-4 text-center text-xs text-muted-foreground">{emptyLabel}</span>
          </div>
        )}
        {sum > 0 && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <strong className="text-lg font-semibold leading-tight">{formatTotal ? formatTotal(sum) : sum}</strong>
            {centerLabel && <span className="mt-1 text-xs text-muted-foreground">{centerLabel}</span>}
          </div>
        )}
      </div>
    )
  }
)
DonutChart.displayName = "DonutChart"

/** Color-dot legend with each segment's number — pairs with DonutChart below it. */
function DonutChartLegend({ data, className }: { data: DonutChartDatum[]; className?: string }) {
  return (
    <ul className={cn("grid grid-cols-3 gap-2 text-center", className)}>
      {data.map((item) => (
        <li key={item.key} className="flex flex-col items-center gap-1">
          <span className="flex items-center gap-1.5">
            <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: item.color }} aria-hidden="true" />
            <strong className="text-lg font-semibold leading-none">{item.value}</strong>
          </span>
          <span className="text-xs text-muted-foreground">{item.label}</span>
        </li>
      ))}
    </ul>
  )
}

export { DonutChart, DonutChartLegend }
