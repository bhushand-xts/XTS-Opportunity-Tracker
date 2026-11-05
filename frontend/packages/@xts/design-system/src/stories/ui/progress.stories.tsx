import type { Meta, StoryObj } from "@storybook/react-vite";
import { Progress } from "../../components/ui/progress";

const meta = {
  title: "UI/Progress",
  component: Progress,
  parameters: { layout: "centered" },
  args: { value: 40, className: "w-64" },
} satisfies Meta<typeof Progress>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { args: { value: 0 } };
export const Complete: Story = { args: { value: 100 } };
