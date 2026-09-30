import type { Meta, StoryObj } from "@storybook/react-vite";
import { Textarea } from "../../components/ui/textarea";

const meta = {
  title: "UI/Textarea",
  component: Textarea,
  parameters: { layout: "centered" },
  args: { placeholder: "Add a note about this opportunity...", className: "w-80" },
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WithValue: Story = {
  args: { defaultValue: "Followed up with the customer on pricing." },
};
export const Disabled: Story = { args: { disabled: true, defaultValue: "Disabled" } };
