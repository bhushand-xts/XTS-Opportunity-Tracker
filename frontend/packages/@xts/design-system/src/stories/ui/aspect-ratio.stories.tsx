import type { Meta, StoryObj } from "@storybook/react-vite";
import { AspectRatio } from "../../components/ui/aspect-ratio";

const meta = {
  title: "UI/AspectRatio",
  component: AspectRatio,
  parameters: { layout: "centered" },
  args: { ratio: 16 / 9 },
} satisfies Meta<typeof AspectRatio>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <div className="w-80">
      <AspectRatio {...args} className="flex items-center justify-center rounded-md border bg-muted">
        <span className="text-sm text-muted-foreground">16:9</span>
      </AspectRatio>
    </div>
  ),
};

export const Square: Story = {
  args: { ratio: 1 },
  render: (args) => (
    <div className="w-60">
      <AspectRatio {...args} className="flex items-center justify-center rounded-md border bg-muted">
        <span className="text-sm text-muted-foreground">1:1</span>
      </AspectRatio>
    </div>
  ),
};
