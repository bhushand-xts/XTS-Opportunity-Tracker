import type { Meta, StoryObj } from "@storybook/react-vite";
import { Inbox } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "../../components/ui/empty";

const meta = {
  title: "UI/Empty",
  component: Empty,
  parameters: { layout: "centered" },
} satisfies Meta<typeof Empty>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Empty className="w-96 border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Inbox />
        </EmptyMedia>
        <EmptyTitle>No opportunities yet</EmptyTitle>
        <EmptyDescription>
          Create your first opportunity to start tracking your pipeline.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button>New opportunity</Button>
      </EmptyContent>
    </Empty>
  ),
};
