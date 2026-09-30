import type { Meta, StoryObj } from "@storybook/react-vite";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";

const meta = {
  title: "UI/Label",
  component: Label,
  parameters: { layout: "centered" },
  args: { children: "Email address" },
} satisfies Meta<typeof Label>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithInput: Story = {
  render: (args) => (
    <div className="grid w-72 gap-1.5">
      <Label htmlFor="label-email" {...args} />
      <Input id="label-email" type="email" placeholder="jordan.blake@xts.com" />
    </div>
  ),
};
