import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { AppShellFilterTabs } from "../../components/AppShellFilterTabs";

const TABS = [
  { value: "all", label: "All", count: 24 },
  { value: "open", label: "Open", count: 16 },
  { value: "won", label: "Won", count: 6 },
  { value: "lost", label: "Lost", count: 2 },
];

const meta = {
  title: "Composite/AppShellFilterTabs",
  component: AppShellFilterTabs,
  parameters: { layout: "padded" },
  args: { tabs: TABS, value: "all", onChange: fn() },
} satisfies Meta<typeof AppShellFilterTabs>;

export default meta;
type Story = StoryObj<typeof meta>;

function InteractiveTabs() {
  const [value, setValue] = useState("all");
  return <AppShellFilterTabs tabs={TABS} value={value} onChange={setValue} />;
}

export const Default: Story = {
  render: () => <InteractiveTabs />,
};
