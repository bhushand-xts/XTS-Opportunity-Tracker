import { useEffect, useMemo, useRef, useState } from "react";
import { Pencil, Share2 } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Checkbox,
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  PageHeader,
  ScrollArea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  useSetPageTitle,
} from "@xts/design-system";
import { useRoles } from "../role-management/useRoles";
import { useMenus } from "../menu-management/useMenus";
import { useAllRoleAccess } from "./useAllRoleAccess";
import { useRoleMenuPermissions } from "./useRoleMenuPermissions";
import { useSaveRoleMenuPermissions } from "./useSaveRoleMenuPermissions";

function sortedKey(ids: number[]): string {
  return [...ids].sort((a, b) => a - b).join(",");
}

export function RoleMenuPermissionAssignmentPage() {
  useSetPageTitle("Role-Menu-Permission Assignment");
  const { roles } = useRoles();
  const activeRoles = roles.filter((r) => r.isActive);

  const { menus } = useMenus();
  const activeMenus = menus.filter((m) => m.isActive);

  const [roleId, setRoleId] = useState<string>();
  const [menuId, setMenuId] = useState<string>();
  const editorRef = useRef<HTMLDivElement>(null);

  const { availablePermissions, grantedPermissionIds, loading, error } = useRoleMenuPermissions(roleId, menuId);
  const { saveRoleMenuPermissions, saving } = useSaveRoleMenuPermissions();

  const activeRoleIds = useMemo(() => activeRoles.map((r) => Number(r.id)), [activeRoles]);
  const {
    rows: allGrants,
    loading: grantsLoading,
    error: grantsError,
    refetch: refetchAllGrants,
  } = useAllRoleAccess(activeRoleIds);
  const roleNameById = useMemo(() => new Map(activeRoles.map((r) => [Number(r.id), r.roleName])), [activeRoles]);

  // All grants, grouped Role -> Menu -> permissions, for the overview below.
  const grantsByRoleAndMenu = useMemo(() => {
    const byRole = new Map<
      number,
      { roleId: number; roleName: string; menus: Map<number, { menuId: number; menuName: string; permissions: { permissionId: number; permissionName: string; permissionKey: string }[] }> }
    >();
    for (const grant of allGrants) {
      const role = byRole.get(grant.roleId) ?? {
        roleId: grant.roleId,
        roleName: roleNameById.get(grant.roleId) ?? `Role ${grant.roleId}`,
        menus: new Map(),
      };
      const menu = role.menus.get(grant.menuId) ?? { menuId: grant.menuId, menuName: grant.menuName, permissions: [] };
      menu.permissions.push({
        permissionId: grant.permissionId,
        permissionName: grant.permissionName,
        permissionKey: grant.permissionKey,
      });
      role.menus.set(grant.menuId, menu);
      byRole.set(grant.roleId, role);
    }
    return [...byRole.values()]
      .map((role) => ({ ...role, menus: [...role.menus.values()].sort((a, b) => a.menuName.localeCompare(b.menuName)) }))
      .sort((a, b) => a.roleName.localeCompare(b.roleName));
  }, [allGrants, roleNameById]);

  // Used by the overview's Edit buttons — selects the role+menu above AND
  // scrolls the editor into view, since the overview can sit well below it
  // once the list is long.
  const editAssignment = (roleIdToEdit: number, menuIdToEdit: number) => {
    setRoleId(String(roleIdToEdit));
    setMenuId(String(menuIdToEdit));
    editorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // The checkbox selection, seeded from the currently-granted permissions
  // whenever the role/menu selection changes or the granted set changes
  // (e.g. after a save refetches it). Keyed on content rather than array
  // identity, since `grantedPermissionIds` is a new array every render.
  const [checkedIds, setCheckedIds] = useState<number[]>([]);
  const [syncedFor, setSyncedFor] = useState<string | null>(null);
  const selectionKey = roleId && menuId ? `${roleId}:${menuId}:${sortedKey(grantedPermissionIds)}` : null;

  useEffect(() => {
    if (selectionKey && selectionKey !== syncedFor) {
      setCheckedIds(grantedPermissionIds);
      setSyncedFor(selectionKey);
    }
  }, [selectionKey, syncedFor, grantedPermissionIds]);

  const handleRoleChange = (value: string) => {
    setRoleId(value);
    setMenuId(undefined);
  };

  const togglePermission = (permissionId: number, checked: boolean) => {
    setCheckedIds((prev) => (checked ? [...prev, permissionId] : prev.filter((id) => id !== permissionId)));
  };

  const isDirty = sortedKey(checkedIds) !== sortedKey(grantedPermissionIds);

  const handleSave = async () => {
    if (!roleId || !menuId) return;
    await saveRoleMenuPermissions({
      roleId: Number(roleId),
      menuId: Number(menuId),
      originalPermissionIds: grantedPermissionIds,
      selectedPermissionIds: checkedIds,
    });
    await refetchAllGrants();
  };

  return (
    <div className="space-y-4 p-5">
      <PageHeader icon={Share2} description="Map menus and granular permissions to a functional role." />

      <Card ref={editorRef}>
        <CardContent className="space-y-4 pt-6">
          {error && <p className="text-sm text-destructive">{error.message}</p>}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Role</label>
              <Select value={roleId} onValueChange={handleRoleChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {activeRoles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.roleName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Menu</label>
              <Select value={menuId} onValueChange={setMenuId} disabled={!roleId}>
                <SelectTrigger>
                  <SelectValue placeholder={roleId ? "Select a menu" : "Select a role first"} />
                </SelectTrigger>
                <SelectContent>
                  {activeMenus.map((menu) => (
                    <SelectItem key={menu.menuId} value={String(menu.menuId)}>
                      {menu.menuName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {roleId && menuId ? (
            <>
              {loading && (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 rounded-md" />
                  ))}
                </div>
              )}

              {!loading && (
                <div>
                  <p className="mb-2 text-sm font-medium">Permissions</p>
                  {availablePermissions.length === 0 ? (
                    <Empty className="py-8">
                      <EmptyTitle>No permissions configured</EmptyTitle>
                      <EmptyDescription>This menu has no permissions defined yet.</EmptyDescription>
                    </Empty>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {availablePermissions.map((permission) => {
                        const checked = checkedIds.includes(permission.permissionId);
                        return (
                          <label
                            key={permission.permissionId}
                            className="flex items-center gap-2 rounded-md border p-2 text-sm transition-colors hover:bg-muted/50"
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(value) => togglePermission(permission.permissionId, value === true)}
                            />
                            <span>
                              {permission.permissionName}
                              <span className="ml-1 text-xs text-muted-foreground">
                                ({permission.permissionKey})
                              </span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-end gap-3">
                <Button onClick={handleSave} disabled={!isDirty || saving || loading}>
                  {saving ? "Saving…" : "Save / Assign"}
                </Button>
              </div>
            </>
          ) : (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Share2 />
                </EmptyMedia>
                <EmptyTitle>Select a role and menu</EmptyTitle>
                <EmptyDescription>Choose a role and menu above to view and manage its permissions.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 pt-6">
          <p className="text-sm font-medium">All role-menu-permission grants</p>
          <p className="text-xs text-muted-foreground">
            Every role with at least one granted permission. Use Edit to jump to it above.
          </p>

          {grantsError && <p className="text-sm text-destructive">{grantsError.message}</p>}
          {grantsLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!grantsLoading && grantsByRoleAndMenu.length === 0 && (
            <p className="text-sm text-muted-foreground">No roles have any granted permissions yet.</p>
          )}

          <ScrollArea className="h-[420px] pr-4">
            <div className="space-y-4">
              {grantsByRoleAndMenu.map((role) => (
                <div key={role.roleId} className="space-y-2">
                  <p className="text-sm font-semibold">{role.roleName}</p>
                  <div className="space-y-2 pl-3">
                    {role.menus.map((menu) => (
                      <div
                        key={menu.menuId}
                        className="rounded-md border p-3 transition-colors hover:bg-muted/50"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{menu.menuName}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Edit ${role.roleName} permissions for ${menu.menuName}`}
                            onClick={() => editAssignment(role.roleId, menu.menuId)}
                          >
                            <Pencil className="size-4" />
                          </Button>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {menu.permissions.map((permission) => (
                            <Badge key={permission.permissionId} variant="secondary">
                              {permission.permissionName}
                              <span className="ml-1 text-muted-foreground">({permission.permissionKey})</span>
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
