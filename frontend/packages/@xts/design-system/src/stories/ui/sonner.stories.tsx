import type { Meta, StoryObj } from "@storybook/react-vite";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import { Toaster } from "../../components/ui/sonner";

const meta = {
  title: "UI/Sonner",
  component: Toaster,
  parameters: { layout: "centered" },
} satisfies Meta<typeof Toaster>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <>
      <Toaster />
      <Button onClick={() => toast.success("Opportunity saved successfully.")}>
        Show toast
      </Button>
    </>
  ),
};
