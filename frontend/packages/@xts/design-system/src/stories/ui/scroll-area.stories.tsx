import type { Meta, StoryObj } from "@storybook/react-vite";
import { ScrollArea } from "../../components/ui/scroll-area";

const meta = {
  title: "UI/ScrollArea",
  component: ScrollArea,
  parameters: { layout: "centered" },
} satisfies Meta<typeof ScrollArea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <ScrollArea className="h-48 w-64 rounded-md border p-4">
      <div className="flex flex-col gap-3 text-sm">
        {Array.from({ length: 12 }, (_, i) => (
          <p key={i}>Opportunity update #{i + 1}</p>
        ))}
      </div>
    </ScrollArea>
  ),
};
