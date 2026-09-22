import type { Meta, StoryObj } from "@storybook/react-vite";
import { toast } from "../../hooks/use-toast";
import { Button } from "../../components/ui/button";
import { Toaster } from "../../components/ui/toaster";

const meta = {
  title: "UI/Toaster",
  component: Toaster,
  parameters: { layout: "centered" },
} satisfies Meta<typeof Toaster>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <>
      <Toaster />
      <Button
        onClick={() =>
          toast({
            title: "Opportunity saved",
            description: "Your changes have been saved successfully.",
          })
        }
      >
        Show toast
      </Button>
    </>
  ),
};
