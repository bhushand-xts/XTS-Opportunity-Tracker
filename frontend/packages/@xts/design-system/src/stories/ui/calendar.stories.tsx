import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { Calendar } from "../../components/ui/calendar";

const meta = {
  title: "UI/Calendar",
  component: Calendar,
  parameters: { layout: "centered" },
} satisfies Meta<typeof Calendar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Calendar mode="single" selected={new Date()} onSelect={fn()} className="rounded-md border" />
  ),
};

export const Range: Story = {
  render: () => (
    <Calendar
      mode="range"
      selected={{ from: new Date(), to: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) }}
      onSelect={fn()}
      numberOfMonths={2}
      className="rounded-md border"
    />
  ),
};
