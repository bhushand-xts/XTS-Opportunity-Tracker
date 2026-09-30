import type { Meta, StoryObj } from "@storybook/react-vite";
import { Bold, Italic, Underline } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "../../components/ui/toggle-group";

const meta = {
  title: "UI/ToggleGroup",
  component: ToggleGroup,
  parameters: { layout: "centered" },
  argTypes: {
    variant: { control: "select", options: ["default", "outline"] },
    size: { control: "select", options: ["default", "sm", "lg"] },
  },
  args: {
    type: "single",
    defaultValue: "bold",
  },
} satisfies Meta<typeof ToggleGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

const items = (
  <>
    <ToggleGroupItem value="bold" aria-label="Toggle bold">
      <Bold className="size-4" />
    </ToggleGroupItem>
    <ToggleGroupItem value="italic" aria-label="Toggle italic">
      <Italic className="size-4" />
    </ToggleGroupItem>
    <ToggleGroupItem value="underline" aria-label="Toggle underline">
      <Underline className="size-4" />
    </ToggleGroupItem>
  </>
);

export const Default: Story = {
  render: (args) => <ToggleGroup {...args}>{items}</ToggleGroup>,
};

export const Outline: Story = {
  args: { variant: "outline" },
  render: (args) => <ToggleGroup {...args}>{items}</ToggleGroup>,
};

export const Multiple: Story = {
  args: { type: "multiple", defaultValue: ["bold"] },
  render: (args) => <ToggleGroup {...args}>{items}</ToggleGroup>,
};
