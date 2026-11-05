import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { LoginView, type LoginMode } from "../../components/LoginView";

const meta = {
  title: "Screens/Login",
  component: LoginView,
  parameters: { layout: "fullscreen" },
  args: { email: "", password: "", mode: "signin", onEmailChange: fn(), onPasswordChange: fn(), onModeChange: fn(), onSso: fn(), onSubmit: (event) => event.preventDefault() },
} satisfies Meta<typeof LoginView>;

export default meta;
type Story = StoryObj<typeof meta>;

function InteractiveLogin({ initialMode }: { initialMode: LoginMode }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<LoginMode>(initialMode);
  return <LoginView email={email} password={password} mode={mode} onEmailChange={setEmail} onPasswordChange={setPassword} onModeChange={setMode} onSso={fn()} onSubmit={(event) => event.preventDefault()} />;
}

export const SignIn: Story = { render: () => <InteractiveLogin initialMode="signin" /> };
export const CreateAccount: Story = { render: () => <InteractiveLogin initialMode="signup" /> };