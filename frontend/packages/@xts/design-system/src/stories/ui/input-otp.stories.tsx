import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from "../../components/ui/input-otp";

const meta = {
  title: "UI/InputOTP",
  component: InputOTP,
  parameters: { layout: "centered" },
  args: {
    maxLength: 6,
    onChange: fn(),
  },
} satisfies Meta<typeof InputOTP>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { maxLength: 6, children: null },
  render: () => (
    <InputOTP maxLength={6} onChange={fn()}>
      <InputOTPGroup>
        <InputOTPSlot index={0} />
        <InputOTPSlot index={1} />
        <InputOTPSlot index={2} />
      </InputOTPGroup>
      <InputOTPSeparator />
      <InputOTPGroup>
        <InputOTPSlot index={3} />
        <InputOTPSlot index={4} />
        <InputOTPSlot index={5} />
      </InputOTPGroup>
    </InputOTP>
  ),
};

export const Disabled: Story = {
  args: { maxLength: 6, disabled: true, defaultValue: "123456", children: null },
  render: () => (
    <InputOTP maxLength={6} defaultValue="123456" disabled onChange={fn()}>
      <InputOTPGroup>
        <InputOTPSlot index={0} />
        <InputOTPSlot index={1} />
        <InputOTPSlot index={2} />
        <InputOTPSlot index={3} />
        <InputOTPSlot index={4} />
        <InputOTPSlot index={5} />
      </InputOTPGroup>
    </InputOTP>
  ),
};
