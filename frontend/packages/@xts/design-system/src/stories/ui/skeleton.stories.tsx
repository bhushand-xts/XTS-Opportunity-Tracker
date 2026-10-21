import type { Meta, StoryObj } from "@storybook/react-vite";
import { Skeleton } from "../../components/ui/skeleton";

const meta = {
  title: "UI/Skeleton",
  component: Skeleton,
  parameters: { layout: "centered" },
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { className: "h-4 w-48" } };
export const Circle: Story = { args: { className: "size-12 rounded-full" } };

export const CardPlaceholder: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      <Skeleton className="size-12 rounded-full" />
      <Skeleton className="h-4 w-48" />
      <Skeleton className="h-4 w-32" />
    </div>
  ),
};
