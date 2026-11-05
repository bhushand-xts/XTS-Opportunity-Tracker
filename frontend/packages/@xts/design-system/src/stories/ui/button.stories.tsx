import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { Mail } from "lucide-react";
import { Button } from "../../components/ui/button";

const meta = {
  title: "UI/Button",
  component: Button,
  parameters: { layout: "centered" },
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "destructive", "outline", "secondary", "ghost", "link"],
    },
    size: {
      control: "select",
      options: ["default", "sm", "lg", "icon"],
    },
  },
  args: {
    children: "Button",
    onClick: fn(),
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

// The six semantic variants used consistently across this app:
// default = primary submit/CTA, destructive = irreversible/remove actions,
// outline = secondary action alongside a primary one (e.g. "Cancel"),
// secondary = lower-emphasis alternative to default, ghost = icon-only
// utility actions in toolbars/headers, link = inline/tertiary actions.
export const Default: Story = { args: { variant: "default" } };
export const Destructive: Story = { args: { variant: "destructive" } };
export const Outline: Story = { args: { variant: "outline" } };
export const Secondary: Story = { args: { variant: "secondary" } };
export const Ghost: Story = { args: { variant: "ghost" } };
export const Link: Story = { args: { variant: "link" } };

export const Small: Story = { args: { size: "sm" } };
export const Large: Story = { args: { size: "lg" } };

export const IconOnly: Story = {
  args: { size: "icon", "aria-label": "Send email", children: <Mail className="size-4" /> },
};

export const Disabled: Story = { args: { disabled: true } };

export const AllVariants: Story = {
  render: (args) => (
    <div className="flex flex-wrap items-center gap-3">
      {(["default", "destructive", "outline", "secondary", "ghost", "link"] as const).map((variant) => (
        <Button key={variant} {...args} variant={variant}>
          {variant}
        </Button>
      ))}
    </div>
  ),
};
