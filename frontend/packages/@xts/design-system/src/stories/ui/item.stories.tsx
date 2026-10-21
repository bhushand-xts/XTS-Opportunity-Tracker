import type { Meta, StoryObj } from "@storybook/react-vite";
import { Building2 } from "lucide-react";
import { Button } from "../../components/ui/button";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemSeparator,
  ItemTitle,
} from "../../components/ui/item";

const meta = {
  title: "UI/Item",
  component: Item,
  parameters: { layout: "centered" },
} satisfies Meta<typeof Item>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <ItemGroup className="w-96 rounded-md border">
      <Item>
        <ItemMedia variant="icon">
          <Building2 />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>Acme Corp</ItemTitle>
          <ItemDescription>Enterprise deal in negotiation stage.</ItemDescription>
        </ItemContent>
        <ItemActions>
          <Button variant="outline" size="sm">
            View
          </Button>
        </ItemActions>
      </Item>
      <ItemSeparator />
      <Item variant="outline">
        <ItemMedia variant="icon">
          <Building2 />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>Globex Inc</ItemTitle>
          <ItemDescription>Newly identified opportunity.</ItemDescription>
        </ItemContent>
        <ItemActions>
          <Button variant="outline" size="sm">
            View
          </Button>
        </ItemActions>
      </Item>
    </ItemGroup>
  ),
};
