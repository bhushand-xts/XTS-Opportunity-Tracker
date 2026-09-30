import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { NewOpportunityDialog } from "../../components/NewOpportunityDialog";

const meta = {
  title: "Forms/New Opportunity",
  component: NewOpportunityDialog,
  parameters: { layout: "centered" },
  args: { open: true, onOpenChange: fn() },
} satisfies Meta<typeof NewOpportunityDialog>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};