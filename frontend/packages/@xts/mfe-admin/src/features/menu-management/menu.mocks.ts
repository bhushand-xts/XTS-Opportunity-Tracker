import type { Menu, MenuInput } from "@xts/api-contracts";
import { registerMockResolver } from "@xts/api-client";
import { slugify } from "./menu.utils";

/**
 * In-memory stand-in for the real backend. Enforces the same rules a real
 * resolver must (duplicate menuName, main-menu-can't-go-inactive-with-an-
 * active-submenu) so the UI's error handling is exercised realistically —
 * delete this file once the backend team's resolvers are live.
 *
 * `__typename: "Menu"` on every object is not decoration — Apollo's
 * InMemoryCache (addTypename: true by default) rewrites queries to request
 * it and needs it to normalize/read back entities. A real GraphQL server
 * resolves `__typename` for free; this hand-rolled mock has to stamp it on
 * manually or fields silently come back undefined from the cache.
 */
type MockMenu = Menu & { __typename: "Menu" };

let menus: MockMenu[] = [
  { __typename: "Menu", id: "1", menuName: "Dashboard", menuType: "MAIN_MENU", parentMenuId: null, icon: "LayoutDashboard", displayOrder: 1, menuKey: "dashboard", isActive: true },
  { __typename: "Menu", id: "2", menuName: "Administration", menuType: "MAIN_MENU", parentMenuId: null, icon: "Settings", displayOrder: 2, menuKey: "administration", isActive: true },
  { __typename: "Menu", id: "3", menuName: "Menu Management", menuType: "SUB_MENU", parentMenuId: "2", icon: "ListChecks", displayOrder: 1, menuKey: "menu-management", isActive: true },
  { __typename: "Menu", id: "4", menuName: "User Management", menuType: "SUB_MENU", parentMenuId: "2", icon: "Users", displayOrder: 2, menuKey: "user-management", isActive: false },
  { __typename: "Menu", id: "5", menuName: "Approvals", menuType: "MAIN_MENU", parentMenuId: null, icon: "ShieldCheck", displayOrder: 3, menuKey: "approvals", isActive: true },
];

let nextId = menus.length + 1;

function assertNoDuplicateName(menuName: string, excludeId?: string) {
  const clash = menus.some(
    (m) => m.id !== excludeId && m.menuName.trim().toLowerCase() === menuName.trim().toLowerCase()
  );
  if (clash) {
    throw new Error(`A menu named "${menuName}" already exists.`);
  }
}

function assertMainMenuNotDeactivatedWithActiveChildren(menu: Menu) {
  if (menu.menuType !== "MAIN_MENU" || menu.isActive) return;
  const hasActiveChild = menus.some((m) => m.parentMenuId === menu.id && m.isActive);
  if (hasActiveChild) {
    throw new Error("This Main Menu cannot be set Inactive while it has an active Submenu.");
  }
}

function uniqueMenuKey(menuName: string): string {
  const base = slugify(menuName) || "menu";
  let key = base;
  let suffix = 1;
  while (menus.some((m) => m.menuKey === key)) {
    key = `${base}-${++suffix}`;
  }
  return key;
}

registerMockResolver("GetMenus", () => {
  return { menus: [...menus].sort((a, b) => a.displayOrder - b.displayOrder) };
});

registerMockResolver("CreateMenu", (variables) => {
  const input = variables.input as MenuInput;
  assertNoDuplicateName(input.menuName);

  const menu: MockMenu = {
    __typename: "Menu",
    id: String(nextId++),
    menuName: input.menuName.trim(),
    menuType: input.menuType,
    parentMenuId: input.menuType === "SUB_MENU" ? input.parentMenuId : null,
    icon: input.icon ?? null,
    displayOrder: input.displayOrder,
    menuKey: uniqueMenuKey(input.menuName),
    isActive: input.isActive,
  };

  assertMainMenuNotDeactivatedWithActiveChildren(menu);
  menus = [...menus, menu];
  return { createMenu: menu };
});

registerMockResolver("UpdateMenu", (variables) => {
  const { id, input } = variables as { id: string; input: MenuInput };
  const existing = menus.find((m) => m.id === id);
  if (!existing) {
    throw new Error("Menu not found.");
  }
  assertNoDuplicateName(input.menuName, id);

  const updated: MockMenu = {
    ...existing,
    menuName: input.menuName.trim(),
    menuType: input.menuType,
    parentMenuId: input.menuType === "SUB_MENU" ? input.parentMenuId : null,
    icon: input.icon ?? null,
    displayOrder: input.displayOrder,
    isActive: input.isActive,
    // menuKey is a stable identifier — intentionally not regenerated on rename.
  };

  assertMainMenuNotDeactivatedWithActiveChildren(updated);
  menus = menus.map((m) => (m.id === id ? updated : m));
  return { updateMenu: updated };
});
