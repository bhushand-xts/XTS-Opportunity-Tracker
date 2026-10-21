import type { Meta, StoryObj } from "@storybook/react-vite";
import { Kbd, KbdGroup } from "../../components/ui/kbd";

const meta = {
  title: "UI/Kbd",
  component: Kbd,
  parameters: { layout: "centered" },
  args: { children: "K" },
} satisfies Meta<typeof Kbd>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Group: Story = {
  render: () => (
    <KbdGroup>
      <Kbd>Ctrl</Kbd>
      <Kbd>Shift</Kbd>
      <Kbd>P</Kbd>
    </KbdGroup>
  ),
};
