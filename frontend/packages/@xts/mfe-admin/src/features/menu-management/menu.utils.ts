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

export interface MenuTreeRow<T extends { menuId: number; parentId: number | null; sortOrder: number }> {
  menu: T;
  depth: number;
}

/** Flattens a flat menu list into hierarchy order (each parent immediately
 * followed by its children, recursively) with a `depth` for indentation —
 * purely a client-side view over the existing flat `parentId`/`sortOrder`
 * fields, no new backend data needed. */
export function buildMenuTree<T extends { menuId: number; parentId: number | null; sortOrder: number }>(
  menus: T[]
): MenuTreeRow<T>[] {
  const byParent = new Map<number | null, T[]>();
  for (const menu of menus) {
    const list = byParent.get(menu.parentId) ?? [];
    list.push(menu);
    byParent.set(menu.parentId, list);
  }
  for (const list of byParent.values()) {
    list.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  const rows: MenuTreeRow<T>[] = [];
  const seen = new Set<number>();

  function walk(parentId: number | null, depth: number) {
    for (const menu of byParent.get(parentId) ?? []) {
      if (seen.has(menu.menuId)) continue; // guards against a cyclic parentId
      seen.add(menu.menuId);
      rows.push({ menu, depth });
      walk(menu.menuId, depth + 1);
    }
  }

  walk(null, 0);

  // A menu whose parentId points at something missing (e.g. a deleted
  // parent) would otherwise vanish silently — surface it as a root instead.
  for (const menu of menus) {
    if (!seen.has(menu.menuId)) {
      seen.add(menu.menuId);
      rows.push({ menu, depth: 0 });
    }
  }

  return rows;
}
