import type { Meta, StoryObj } from "@storybook/react-vite";
import { Separator } from "../../components/ui/separator";

const meta = {
  title: "UI/Separator",
  component: Separator,
  parameters: { layout: "centered" },
} satisfies Meta<typeof Separator>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Horizontal: Story = {
  render: () => (
    <div className="w-64">
      <div className="text-sm font-medium">Opportunity details</div>
      <Separator className="my-2" />
      <div className="text-sm text-muted-foreground">Stage, owner, and value.</div>
    </div>
  ),
};

export const Vertical: Story = {
  render: () => (
    <div className="flex h-8 items-center gap-4 text-sm">
      <span>Overview</span>
      <Separator orientation="vertical" />
      <span>Activity</span>
      <Separator orientation="vertical" />
      <span>Notes</span>
    </div>
  ),
};
