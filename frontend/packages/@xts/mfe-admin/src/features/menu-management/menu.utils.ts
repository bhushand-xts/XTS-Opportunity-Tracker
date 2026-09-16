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

export function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Curated lookup for the grid's Icon column. Falls back to the raw text
 * for icon names outside this set — extend as more icons are needed. */
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
