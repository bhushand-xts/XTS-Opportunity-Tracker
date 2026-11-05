import type { Meta, StoryObj } from "@storybook/react-vite";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../../components/ui/accordion";

const meta = {
  title: "UI/Accordion",
  component: Accordion,
  parameters: { layout: "centered" },
  args: { type: "single" },
} satisfies Meta<typeof Accordion>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Accordion type="single" collapsible className="w-96">
      <AccordionItem value="item-1">
        <AccordionTrigger>What is an opportunity stage?</AccordionTrigger>
        <AccordionContent>
          A stage represents where an opportunity sits in the sales pipeline, from Identified
          through Closed Won or Closed Lost.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-2">
        <AccordionTrigger>Can I reassign an owner?</AccordionTrigger>
        <AccordionContent>
          Yes, any user with edit access can reassign the opportunity owner from the details
          panel.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-3">
        <AccordionTrigger>How is forecast value calculated?</AccordionTrigger>
        <AccordionContent>
          Forecast value is the deal value multiplied by the probability associated with the
          current stage.
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
};
