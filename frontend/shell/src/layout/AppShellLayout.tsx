import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";

export function AppShellLayout({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="app-shell-content">{children}</main>
    </div>
  );
}
