import type { Meta, StoryObj } from "@storybook/react-vite";
import { Mail, Search } from "lucide-react";
import { fn } from "storybook/test";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
} from "../../components/ui/input-group";

const meta = {
  title: "UI/InputGroup",
  component: InputGroup,
  parameters: { layout: "centered" },
} satisfies Meta<typeof InputGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithIcon: Story = {
  render: () => (
    <InputGroup className="w-72">
      <InputGroupAddon>
        <Search />
      </InputGroupAddon>
      <InputGroupInput placeholder="Search opportunities..." />
    </InputGroup>
  ),
};

export const WithButton: Story = {
  render: () => (
    <InputGroup className="w-72">
      <InputGroupAddon>
        <Mail />
      </InputGroupAddon>
      <InputGroupInput type="email" placeholder="jordan.blake@xts.com" />
      <InputGroupAddon align="inline-end">
        <InputGroupButton onClick={fn()}>Verify</InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  ),
};

export const WithText: Story = {
  render: () => (
    <InputGroup className="w-72">
      <InputGroupAddon>
        <InputGroupText>https://</InputGroupText>
      </InputGroupAddon>
      <InputGroupInput placeholder="yourcompany.com" />
    </InputGroup>
  ),
};
