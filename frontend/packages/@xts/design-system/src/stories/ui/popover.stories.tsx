import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "../../components/ui/popover";

const meta = {
  title: "UI/Popover",
  component: Popover,
  parameters: { layout: "centered" },
} satisfies Meta<typeof Popover>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">Edit deal value</Button>
      </PopoverTrigger>
      <PopoverContent className="w-72">
        <div className="grid gap-2">
          <Label htmlFor="popover-value">Deal value</Label>
          <Input id="popover-value" defaultValue="$45,000" />
        </div>
      </PopoverContent>
    </Popover>
  ),
};
