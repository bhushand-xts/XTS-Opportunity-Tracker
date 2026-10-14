import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";

const meta = {
  title: "UI/Table",
  component: Table,
  parameters: { layout: "centered" },
} satisfies Meta<typeof Table>;

export default meta;
type Story = StoryObj<typeof meta>;

const opportunities = [
  { name: "Acme Corp Renewal", stage: "Negotiation", owner: "Jordan Blake", value: "$42,000" },
  { name: "Globex Expansion", stage: "Identified", owner: "Sam Lee", value: "$18,500" },
  { name: "Initech Migration", stage: "Closed Won", owner: "Priya Nair", value: "$76,200" },
];

export const Default: Story = {
  render: () => (
    <Table className="w-[500px]">
      <TableCaption>A list of recent opportunities.</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Stage</TableHead>
          <TableHead>Owner</TableHead>
          <TableHead className="text-right">Value</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {opportunities.map((opportunity) => (
          <TableRow key={opportunity.name}>
            <TableCell className="font-medium">{opportunity.name}</TableCell>
            <TableCell>{opportunity.stage}</TableCell>
            <TableCell>{opportunity.owner}</TableCell>
            <TableCell className="text-right">{opportunity.value}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  ),
};
