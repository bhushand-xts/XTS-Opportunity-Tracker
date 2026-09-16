import type { Meta, StoryObj } from "@storybook/react-vite";
import { Input } from "../../components/ui/input";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
} from "../../components/ui/field";

const meta = {
  title: "UI/Field",
  component: Field,
  parameters: { layout: "centered" },
} satisfies Meta<typeof Field>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <FieldSet className="w-96">
      <FieldLegend>Contact details</FieldLegend>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="field-name">Full name</FieldLabel>
          <Input id="field-name" placeholder="Jordan Blake" />
          <FieldDescription>As it appears on your ID.</FieldDescription>
        </Field>
        <FieldSeparator />
        <Field>
          <FieldLabel htmlFor="field-email">Email</FieldLabel>
          <Input id="field-email" type="email" placeholder="jordan.blake@xts.com" />
          <FieldError errors={[{ message: "Enter a valid email address." }]} />
        </Field>
      </FieldGroup>
    </FieldSet>
  ),
};
