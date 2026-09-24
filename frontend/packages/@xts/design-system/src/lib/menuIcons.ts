import {
  Layers,
  LayoutDashboard,
  ListChecks,
  Menu as MenuIcon,
  Settings,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";

/** Curated lookup for `Menu.icon` (a plain string column, set via Menu
 * Master's Icon select). Icon names outside this set resolve to null —
 * extend the list as more icons are needed. Shared between the sidebar
 * (AppShell) and Menu Master's own Icon column/picker, so both stay in
 * sync with a single source of truth. */
const ICONS: Record<string, LucideIcon> = {
  LayoutDashboard,
  Settings,
  ShieldCheck,
  Users,
  ListChecks,
  Layers,
  Menu: MenuIcon,
};

export function resolveIcon(name: string | null): LucideIcon | null {
  if (!name) return null;
  return ICONS[name] ?? null;
}

export const ICON_OPTIONS = Object.keys(ICONS);
