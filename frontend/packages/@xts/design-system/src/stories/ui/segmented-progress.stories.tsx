import type { Meta, StoryObj } from "@storybook/react-vite";
import { SegmentedProgress } from "../../components/ui/segmented-progress";

const meta = {
  title: "UI/SegmentedProgress",
  component: SegmentedProgress,
  parameters: { layout: "centered" },
  args: { value: 3, max: 5, className: "w-40", "aria-label": "Stage 3 of 5" },
} satisfies Meta<typeof SegmentedProgress>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
/** The workflow ramp: each step uses its --progress-N colour, so later steps read greener. */
export const ProgressRamp: Story = {
  render: () => (
    <div className="w-40 space-y-2">
      <SegmentedProgress value={1} max={5} indicatorClassName="bg-progress-1" aria-label="Stage 1 of 5" />
      <SegmentedProgress value={2} max={5} indicatorClassName="bg-progress-2" aria-label="Stage 2 of 5" />
      <SegmentedProgress value={3} max={5} indicatorClassName="bg-progress-3" aria-label="Stage 3 of 5" />
      <SegmentedProgress value={4} max={5} indicatorClassName="bg-progress-4" aria-label="Stage 4 of 5" />
      <SegmentedProgress value={5} max={5} indicatorClassName="bg-progress-5" aria-label="Stage 5 of 5" />
      <SegmentedProgress value={3} max={5} indicatorClassName="bg-destructive" aria-label="Stopped at stage 3 of 5" />
    </div>
  ),
};
