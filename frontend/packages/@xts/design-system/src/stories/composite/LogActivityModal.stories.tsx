import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { LogActivityModal } from "../../components/LogActivityModal";

const meta = {
  title: "Composite/LogActivityModal",
  component: LogActivityModal,
  parameters: { layout: "centered" },
  args: { open: true, onOpenChange: fn(), opportunityId: "opp-1" },
} satisfies Meta<typeof LogActivityModal>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
