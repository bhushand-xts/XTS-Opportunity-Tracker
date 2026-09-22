import type { Meta, StoryObj } from "@storybook/react-vite";
import { DashboardContent } from "../../components/DashboardContent";

const meta = {
  title: "Screens/Dashboard",
  component: DashboardContent,
  parameters: { layout: "fullscreen" },
  decorators: [(Story) => <div className="min-h-screen bg-background"><header className="flex h-14 items-center border-b bg-card px-5"><h1 className="text-[15px] font-semibold">Dashboard</h1></header><Story /></div>],
} satisfies Meta<typeof DashboardContent>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};