import type { Meta, StoryObj } from "@storybook/react-vite";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "../../components/ui/chart";

const chartData = [
  { month: "January", opportunities: 18 },
  { month: "February", opportunities: 24 },
  { month: "March", opportunities: 15 },
  { month: "April", opportunities: 32 },
  { month: "May", opportunities: 27 },
  { month: "June", opportunities: 21 },
];

const chartConfig = {
  opportunities: {
    label: "Opportunities",
    color: "#2563eb",
  },
} satisfies ChartConfig;

function OpportunitiesBarChart() {
  return (
    <ChartContainer config={chartConfig} className="h-64 w-96">
      <BarChart data={chartData}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="month"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tickFormatter={(value: string) => value.slice(0, 3)}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="opportunities" fill="var(--color-opportunities)" radius={4} />
      </BarChart>
    </ChartContainer>
  );
}

const meta = {
  title: "UI/Chart",
  component: OpportunitiesBarChart,
  parameters: { layout: "centered" },
} satisfies Meta<typeof OpportunitiesBarChart>;

export default meta;
type Story = StoryObj<typeof meta>;

export const BarExample: Story = {};
