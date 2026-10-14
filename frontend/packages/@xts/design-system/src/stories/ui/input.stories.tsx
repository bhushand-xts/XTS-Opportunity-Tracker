import type { Meta, StoryObj } from "@storybook/react-vite";
import { Input } from "../../components/ui/input";

const meta = {
  title: "UI/Input",
  component: Input,
  parameters: { layout: "centered" },
  args: { placeholder: "Enter your email" },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WithValue: Story = { args: { defaultValue: "jordan.blake@xts.com" } };
export const Disabled: Story = { args: { disabled: true, defaultValue: "Disabled" } };
export const Password: Story = { args: { type: "password", defaultValue: "hunter2" } };
export const Number: Story = { args: { type: "number", defaultValue: 1 } };
