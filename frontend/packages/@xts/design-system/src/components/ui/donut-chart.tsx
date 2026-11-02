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
  centerLabel?: string
  /** Shown instead of the ring when every value is zero. */
  emptyLabel?: string
}

/** A small donut (ring) chart with the total centered inside it — built on the
 * existing recharts-backed ChartContainer so every consumer shares one theme. */
const DonutChart = React.forwardRef<HTMLDivElement, DonutChartProps>(
  ({ data, total, centerLabel, emptyLabel = "No data", className, ...props }, ref) => {
    const sum = total ?? data.reduce((acc, item) => acc + item.value, 0)
    const config: ChartConfig = Object.fromEntries(
      data.map((item) => [item.key, { label: item.label, color: item.color }])
    )

    return (
      <div ref={ref} className={cn("relative mx-auto w-full max-w-[180px]", className)} {...props}>
        {sum > 0 ? (
          <ChartContainer config={config} className="mx-auto aspect-square max-h-[180px]">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent hideLabel nameKey="label" />} />
              <Pie
                data={data}
                dataKey="value"
                nameKey="label"
                innerRadius="65%"
                outerRadius="100%"
                paddingAngle={data.filter((item) => item.value > 0).length > 1 ? 3 : 0}
                strokeWidth={2}
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
            <strong className="text-2xl font-semibold leading-none">{sum}</strong>
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
