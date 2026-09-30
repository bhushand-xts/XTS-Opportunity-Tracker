import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";

const meta = {
  title: "UI/Select",
  component: Select,
  parameters: { layout: "centered" },
  args: {
    onValueChange: fn(),
  },
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <Select {...args}>
      <SelectTrigger className="w-56">
        <SelectValue placeholder="Select a stage" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="identified">Identified</SelectItem>
        <SelectItem value="qualified">Qualified</SelectItem>
        <SelectItem value="proposal">Proposal</SelectItem>
        <SelectItem value="won">Won</SelectItem>
      </SelectContent>
    </Select>
  ),
};

export const WithGroups: Story = {
  render: (args) => (
    <Select {...args}>
      <SelectTrigger className="w-56">
        <SelectValue placeholder="Select an owner" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Sales</SelectLabel>
          <SelectItem value="jordan">Jordan Blake</SelectItem>
          <SelectItem value="alex">Alex Rivera</SelectItem>
        </SelectGroup>
        <SelectSeparator />
        <SelectGroup>
          <SelectLabel>Support</SelectLabel>
          <SelectItem value="sam">Sam Lee</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  ),
};

export const Disabled: Story = {
  args: { disabled: true },
  render: (args) => (
    <Select {...args}>
      <SelectTrigger className="w-56">
        <SelectValue placeholder="Select a stage" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="identified">Identified</SelectItem>
      </SelectContent>
    </Select>
  ),
};
