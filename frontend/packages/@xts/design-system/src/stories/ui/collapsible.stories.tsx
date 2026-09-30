import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "../../components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../../components/ui/collapsible";

const meta = {
  title: "UI/Collapsible",
  component: Collapsible,
  parameters: { layout: "centered" },
} satisfies Meta<typeof Collapsible>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Collapsible className="w-72 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">3 opportunities in review</p>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm">
            Toggle
          </Button>
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent className="space-y-2">
        <div className="rounded-md border px-4 py-2 text-sm">Acme Corp Renewal</div>
        <div className="rounded-md border px-4 py-2 text-sm">Globex Expansion</div>
        <div className="rounded-md border px-4 py-2 text-sm">Initech Upsell</div>
      </CollapsibleContent>
    </Collapsible>
  ),
};
