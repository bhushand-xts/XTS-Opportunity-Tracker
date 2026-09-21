import { useEffect, useState } from "react";
import {
  Button,
  Card,
  CardContent,
  Checkbox,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useSetPageTitle,
} from "@xts/design-system";
import { useRoles } from "../role-management/useRoles";
import { useMenus } from "../menu-management/useMenus";
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

  const { availablePermissions, grantedPermissionIds, loading, error } = useRoleMenuPermissions(roleId, menuId);
  const { saveRoleMenuPermissions, saving } = useSaveRoleMenuPermissions();

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
  };

  return (
    <div className="space-y-4 p-5">
      <p className="text-sm text-muted-foreground">Map menus and granular permissions to a functional role.</p>

      <Card>
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

          {roleId && menuId && (
            <>
              {loading && <p className="text-sm text-muted-foreground">Loading…</p>}

              {!loading && (
                <div>
                  <p className="mb-2 text-sm font-medium">Permissions</p>
                  {availablePermissions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No permissions are configured for this menu.</p>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {availablePermissions.map((permission) => {
                        const checked = checkedIds.includes(permission.permissionId);
                        return (
                          <label
                            key={permission.permissionId}
                            className="flex items-center gap-2 rounded-md border p-2 text-sm"
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
