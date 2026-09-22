import { useMemo, useState } from "react";
import { useQuery } from "@apollo/client";
import { ShieldCheck } from "lucide-react";
import type { MenuPermissionMapping } from "@xts/api-contracts";
import {
  Card,
  CardContent,
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  useSetPageTitle,
} from "@xts/design-system";
import { PageHeader } from "../../components/PageHeader";
import { ErrorNotice } from "../../components/TableStates";
import { GET_MENU_PERMISSION_MAPPINGS } from "../menu-permission-mapping/mapping.queries";
import { useMenus } from "../menu-management/useMenus";
import { usePermissions } from "../permission-management/usePermissions";
import { useRoles } from "../role-management/useRoles";
import { MenuList } from "./MenuList";
import { PermissionPanel } from "./PermissionPanel";
import { permissionsByMenu, visibleRows } from "./matrixLogic";
import { RoleSummaryCard } from "./RoleSummaryCard";
import { UnsavedChangesBar } from "./UnsavedChangesBar";
import { grantKey, useRoleMenuPermissions } from "./useRoleMenuPermissions";
import { useSaveRoleMenuPermissions, type MenuChange } from "./useSaveRoleMenuPermissions";

export function RoleMenuPermissionAssignmentPage() {
  useSetPageTitle("Role Menu Permission Assignment");
  const { roles, loading: rolesLoading, error: rolesError } = useRoles();
  const { rows, loading: menusLoading, error: menusError } = useMenus();
  const { permissions, error: permissionsError } = usePermissions();
  // The mappings are edited on another screen, so always refresh them from the server.
  const mappingsQuery = useQuery<{ menuPermissionMappings: MenuPermissionMapping[] }>(GET_MENU_PERMISSION_MAPPINGS, {
    fetchPolicy: "cache-and-network",
  });

  const [roleId, setRoleId] = useState<number>();
  // Unsaved edits for the selected role. Switching roles discards them.
  const [draft, setDraft] = useState<{ roleId: number; keys: Set<string> } | null>(null);
  const [pickedMenuId, setPickedMenuId] = useState<number>();
  const [search, setSearch] = useState("");
  const [showEmpty, setShowEmpty] = useState(false);

  const { granted, loading: accessLoading, error: accessError } = useRoleMenuPermissions(roleId);
  const { save, saving } = useSaveRoleMenuPermissions();

  const activeMenus = useMemo(() => rows.filter(({ menu }) => menu.isActive), [rows]);
  const activePermissionIds = useMemo(
    () => new Set(permissions.filter((p) => p.isActive).map((p) => p.permissionId)),
    [permissions]
  );

  // Permissions that may be granted on each menu (set up in Menu Permission Mapping).
  const availableByMenu = useMemo(() => {
    const byMenu = new Map<number, MenuPermissionMapping[]>();
    for (const m of mappingsQuery.data?.menuPermissionMappings ?? []) {
      if (!activePermissionIds.has(m.permissionId)) continue;
      byMenu.set(m.menuId, [...(byMenu.get(m.menuId) ?? []), m]);
    }
    return byMenu;
  }, [mappingsQuery.data, activePermissionIds]);
  const allowed = useMemo(() => permissionsByMenu(availableByMenu), [availableByMenu]);

  const selected = draft && draft.roleId === roleId ? draft.keys : granted;

  // ---- what changed compared with the server
  const changes = useMemo<MenuChange[]>(() => {
    const result: MenuChange[] = [];
    for (const { menu } of activeMenus) {
      const add: number[] = [];
      const remove: number[] = [];
      for (const permissionId of allowed.get(menu.menuId) ?? []) {
        const key = grantKey(menu.menuId, permissionId);
        if (selected.has(key) && !granted.has(key)) add.push(permissionId);
        if (!selected.has(key) && granted.has(key)) remove.push(permissionId);
      }
      if (add.length || remove.length) result.push({ menuId: menu.menuId, add, remove });
    }
    return result;
  }, [activeMenus, allowed, selected, granted]);
  const changeCount = changes.reduce((sum, c) => sum + c.add.length + c.remove.length, 0);
  const changedMenuIds = useMemo(() => new Set(changes.map((c) => c.menuId)), [changes]);

  // ---- which menus the list shows, and which one is open
  const shown = useMemo(
    () => visibleRows(activeMenus, (id) => (allowed.get(id)?.size ?? 0) > 0, { search, showEmpty }),
    [activeMenus, allowed, search, showEmpty]
  );
  const hiddenEmptyMenus = activeMenus.filter(({ menu }) => (allowed.get(menu.menuId)?.size ?? 0) === 0).length;

  // The menu you picked, or — until you pick one — the first menu that has permissions.
  const openable = shown.filter(({ menu }) => (allowed.get(menu.menuId)?.size ?? 0) > 0 || showEmpty);
  const activeMenuId =
    openable.find((r) => r.menu.menuId === pickedMenuId)?.menu.menuId ?? openable.find((r) => (allowed.get(r.menu.menuId)?.size ?? 0) > 0)?.menu.menuId;
  const activeMenu = activeMenus.find((r) => r.menu.menuId === activeMenuId)?.menu;
  const parentName = activeMenus.find((r) => r.menu.menuId === activeMenu?.parentId)?.menu.menuName;

  const counts = (menuId: number) => {
    const perms = allowed.get(menuId);
    if (!perms) return { granted: 0, total: 0 };
    let ticked = 0;
    for (const p of perms) if (selected.has(grantKey(menuId, p))) ticked += 1;
    return { granted: ticked, total: perms.size };
  };

  // ---- role summary numbers (over every menu that has permissions, live with unsaved edits)
  const stats = useMemo(() => {
    let total = 0;
    let grantedCount = 0;
    let menusWithAccess = 0;
    let menusTotal = 0;
    for (const { menu } of activeMenus) {
      const perms = allowed.get(menu.menuId);
      if (!perms || perms.size === 0) continue;
      menusTotal += 1;
      total += perms.size;
      let ticked = 0;
      for (const p of perms) if (selected.has(grantKey(menu.menuId, p))) ticked += 1;
      grantedCount += ticked;
      if (ticked > 0) menusWithAccess += 1;
    }
    return { menusWithAccess, menusTotal, granted: grantedCount, total };
  }, [activeMenus, allowed, selected]);

  // ---- editing
  // Built from the latest draft (not from the value captured at render time), so
  // several quick clicks in a row can never overwrite one another.
  const setKeys = (update: (keys: Set<string>) => void) => {
    if (roleId === undefined) return;
    setDraft((previous) => {
      const next = new Set(previous && previous.roleId === roleId ? previous.keys : granted);
      update(next);
      return { roleId, keys: next };
    });
  };

  const setCell = (keys: Set<string>, menuId: number, permissionId: number, checked: boolean) => {
    const key = grantKey(menuId, permissionId);
    if (checked) keys.add(key);
    else keys.delete(key);
  };

  const togglePermission = (permissionId: number, checked: boolean) => {
    if (activeMenuId !== undefined) setKeys((keys) => setCell(keys, activeMenuId, permissionId, checked));
  };

  const setAllForActiveMenu = (checked: boolean) => {
    if (activeMenuId === undefined) return;
    setKeys((keys) => {
      for (const permissionId of allowed.get(activeMenuId) ?? []) setCell(keys, activeMenuId, permissionId, checked);
    });
  };

  const handleSave = async () => {
    if (roleId === undefined) return;
    await save(roleId, changes);
    // Show what the server really holds — this is also right after a partial failure.
    setDraft(null);
  };

  const activeRoles = roles.filter((r) => r.isActive);
  const role = activeRoles.find((r) => r.id === roleId);
  const error = rolesError ?? menusError ?? permissionsError ?? mappingsQuery.error ?? accessError;
  const loading = menusLoading || (mappingsQuery.loading && !mappingsQuery.data) || accessLoading;

  return (
    <div className={`mx-auto w-full max-w-[1500px] space-y-5 p-6 ${changeCount > 0 ? "pb-28" : ""}`}>
      <PageHeader description="Decide what each role can do on each menu. Pick a menu, tick the permissions to grant, then save all changes together." />

      {error && <ErrorNotice error={error} />}

      <RoleSummaryCard
        roles={activeRoles}
        role={role}
        onSelect={setRoleId}
        loading={rolesLoading}
        stats={stats}
        statsLoading={loading}
      />

      {!role ? (
        <Card>
          <CardContent className="py-10">
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <ShieldCheck />
                </EmptyMedia>
                <EmptyTitle>No role selected</EmptyTitle>
                <EmptyDescription>Choose a role above to see and edit the access it holds on every menu.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          </CardContent>
        </Card>
      ) : (
        <section className="grid items-start gap-5 lg:grid-cols-[minmax(280px,340px)_1fr]" aria-label="Access by menu">
          <MenuList
            rows={shown}
            activeMenuId={activeMenuId}
            onSelect={setPickedMenuId}
            counts={counts}
            search={search}
            onSearch={setSearch}
            showEmpty={showEmpty}
            onShowEmpty={setShowEmpty}
            hiddenEmptyMenus={hiddenEmptyMenus}
            changedMenuIds={changedMenuIds}
          />
          <PermissionPanel
            key={activeMenuId ?? "none"}
            menu={activeMenu}
            parentName={parentName}
            permissions={activeMenuId === undefined ? [] : (availableByMenu.get(activeMenuId) ?? [])}
            selected={selected}
            granted={granted}
            loading={loading}
            onToggle={togglePermission}
            onSetAll={setAllForActiveMenu}
          />
        </section>
      )}

      {changeCount > 0 && (
        <UnsavedChangesBar
          changes={changeCount}
          menus={changes.length}
          saving={saving}
          onReset={() => setDraft(null)}
          onSave={() => void handleSave()}
        />
      )}
    </div>
  );
}
