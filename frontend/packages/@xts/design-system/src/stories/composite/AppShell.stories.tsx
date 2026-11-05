import { useEffect } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { MemoryRouter } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { AppShell } from "../../components/AppShell";

// AppShell calls useAuth()/useStore() and react-router-dom hooks internally,
// so it needs both a Router context and a real (demo) session to render its
// main content — without a session it renders null and redirects, per its
// own guard clause.
function SignedInAppShell() {
  const { session, signInWithSso } = useAuth();

  useEffect(() => {
    if (!session) signInWithSso();
  }, [session, signInWithSso]);

  if (!session) return null;

  return (
    <AppShell>
      <div className="p-6 text-sm text-muted-foreground">Page content renders here.</div>
    </AppShell>
  );
}

const meta = {
  title: "Composite/AppShell",
  component: AppShell,
  parameters: { layout: "fullscreen" },
  args: { children: null },
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Story />
      </MemoryRouter>
    ),
  ],
} satisfies Meta<typeof AppShell>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <SignedInAppShell />,
};
