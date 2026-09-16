import type { Meta, StoryObj } from "@storybook/react-vite";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "../../components/ui/resizable";

const meta = {
  title: "UI/Resizable",
  component: ResizablePanelGroup,
  parameters: { layout: "centered" },
  args: { direction: "horizontal" },
} satisfies Meta<typeof ResizablePanelGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { direction: "horizontal" },
  render: (args) => (
    <ResizablePanelGroup {...args} className="h-48 w-96 rounded-md border">
      <ResizablePanel defaultSize={50}>
        <div className="flex h-full items-center justify-center p-6 text-sm">Sidebar</div>
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={50}>
        <div className="flex h-full items-center justify-center p-6 text-sm">Content</div>
      </ResizablePanel>
    </ResizablePanelGroup>
  ),
};

export const Vertical: Story = {
  args: { direction: "vertical" },
  render: (args) => (
    <ResizablePanelGroup {...args} className="h-64 w-80 rounded-md border">
      <ResizablePanel defaultSize={40}>
        <div className="flex h-full items-center justify-center p-6 text-sm">Header</div>
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={60}>
        <div className="flex h-full items-center justify-center p-6 text-sm">Body</div>
      </ResizablePanel>
    </ResizablePanelGroup>
  ),
};
