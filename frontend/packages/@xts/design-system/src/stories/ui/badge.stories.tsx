import type { Meta, StoryObj } from "@storybook/react-vite";
import { Badge } from "../../components/ui/badge";

const meta = {
  title: "UI/Badge",
  component: Badge,
  parameters: { layout: "centered" },
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "secondary", "destructive", "outline", "brand", "success", "muted"],
    },
  },
  args: { children: "Badge" },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { variant: "default" } };
export const Secondary: Story = { args: { variant: "secondary" } };
export const Destructive: Story = { args: { variant: "destructive" } };
export const Outline: Story = { args: { variant: "outline" } };
/** The brand blue→cyan gradient — for "this is the primary/main kind" labels
 * (e.g. Menu Master's "Main Menu" type badge), matching the primary Button
 * and active Tab treatment. */
export const Brand: Story = { args: { variant: "brand", children: "Main Menu" } };
/** For an "Active" status — used across every Master/List screen's status column. */
export const Success: Story = { args: { variant: "success", children: "Active" } };
/** For an "Inactive" status — pairs with Success as the other half of that column. */
export const Muted: Story = { args: { variant: "muted", children: "Inactive" } };

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge variant="default">Default</Badge>
      <Badge variant="secondary">Submenu</Badge>
      <Badge variant="destructive">Failed</Badge>
      <Badge variant="outline">Outline</Badge>
      <Badge variant="brand">Main Menu</Badge>
      <Badge variant="success">Active</Badge>
      <Badge variant="muted">Inactive</Badge>
    </div>
  ),
};
