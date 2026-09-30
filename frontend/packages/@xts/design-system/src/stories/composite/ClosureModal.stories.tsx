import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { ClosureModal } from "../../components/ClosureModal";

const meta = {
  title: "Composite/ClosureModal",
  component: ClosureModal,
  parameters: { layout: "centered" },
  args: { open: true, onOpenChange: fn(), opportunityId: "opp-1" },
} satisfies Meta<typeof ClosureModal>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
