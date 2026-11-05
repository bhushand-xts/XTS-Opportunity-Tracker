import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { Label } from "../../components/ui/label";
import { RadioGroup, RadioGroupItem } from "../../components/ui/radio-group";

const meta = {
  title: "UI/RadioGroup",
  component: RadioGroup,
  parameters: { layout: "centered" },
  args: {
    defaultValue: "identified",
    onValueChange: fn(),
  },
} satisfies Meta<typeof RadioGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <RadioGroup {...args}>
      <div className="flex items-center gap-2">
        <RadioGroupItem value="identified" id="stage-identified" />
        <Label htmlFor="stage-identified">Identified</Label>
      </div>
      <div className="flex items-center gap-2">
        <RadioGroupItem value="qualified" id="stage-qualified" />
        <Label htmlFor="stage-qualified">Qualified</Label>
      </div>
      <div className="flex items-center gap-2">
        <RadioGroupItem value="won" id="stage-won" />
        <Label htmlFor="stage-won">Won</Label>
      </div>
    </RadioGroup>
  ),
};

export const Disabled: Story = {
  args: { disabled: true },
  render: (args) => (
    <RadioGroup {...args}>
      <div className="flex items-center gap-2">
        <RadioGroupItem value="identified" id="stage-identified-disabled" />
        <Label htmlFor="stage-identified-disabled">Identified</Label>
      </div>
      <div className="flex items-center gap-2">
        <RadioGroupItem value="qualified" id="stage-qualified-disabled" />
        <Label htmlFor="stage-qualified-disabled">Qualified</Label>
      </div>
    </RadioGroup>
  ),
};
