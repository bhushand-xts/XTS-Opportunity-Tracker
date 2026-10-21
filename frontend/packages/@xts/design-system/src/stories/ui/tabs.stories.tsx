import type { Meta, StoryObj } from "@storybook/react-vite";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";

const meta = {
  title: "UI/Tabs",
  component: Tabs,
  parameters: { layout: "centered" },
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Tabs defaultValue="overview" className="w-96">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="activity">Activity</TabsTrigger>
        <TabsTrigger value="notes">Notes</TabsTrigger>
      </TabsList>
      <TabsContent value="overview" className="text-sm text-muted-foreground">
        Opportunity summary and key details.
      </TabsContent>
      <TabsContent value="activity" className="text-sm text-muted-foreground">
        Recent activity and logged calls.
      </TabsContent>
      <TabsContent value="notes" className="text-sm text-muted-foreground">
        Internal notes for the account team.
      </TabsContent>
    </Tabs>
  ),
};
