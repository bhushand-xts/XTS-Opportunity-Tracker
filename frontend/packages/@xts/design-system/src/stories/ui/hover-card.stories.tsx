import type { Meta, StoryObj } from "@storybook/react-vite";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "../../components/ui/hover-card";

const meta = {
  title: "UI/HoverCard",
  component: HoverCard,
  parameters: { layout: "centered" },
} satisfies Meta<typeof HoverCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <HoverCard>
      <HoverCardTrigger asChild>
        <a href="#" className="text-sm font-medium underline underline-offset-4">
          @jordanblake
        </a>
      </HoverCardTrigger>
      <HoverCardContent>
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold">Jordan Blake</p>
          <p className="text-sm text-muted-foreground">
            Account executive on the Opportunity Tracker team.
          </p>
        </div>
      </HoverCardContent>
    </HoverCard>
  ),
};
