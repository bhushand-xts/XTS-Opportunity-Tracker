import { useEffect, useMemo, useRef, useState } from "react";
import { Pencil } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Checkbox,
  ScrollArea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useSetPageTitle,
} from "@xts/design-system";
import { usePermissions } from "../permission-management/usePermissions";
import { useAllMenuPermissionMappings } from "./useAllMenuPermissionMappings";
import { useMenusForMapping } from "./useMenusForMapping";
import { useMenuPermissions } from "./useMenuPermissions";
import { useSaveMenuPermissions } from "./useSaveMenuPermissions";

function sortedKey(ids: number[]): string {
  return [...ids].sort((a, b) => a - b).join(",");
}

export function MenuPermissionMappingPage() {
  useSetPageTitle("Menu Permission Mapping");

  const { menus } = useMenusForMapping();
  const { permissions, loading: permissionsLoading, error: permissionsError } = usePermissions();

  const [menuId, setMenuId] = useState<string>();
  const editorRef = useRef<HTMLDivElement>(null);

  // Used by the overview's Edit buttons — selects the menu above AND
  // scrolls the editor into view, since the overview can sit well below it
  // once the list is long.
  const editMenu = (id: number) => {
    setMenuId(String(id));
    editorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const {
    mappedPermissionIds,
    loading: mappedLoading,
    error: mappedError,
  } = useMenuPermissions(menuId);
  const { saveMenuPermissions, saving } = useSaveMenuPermissions();
  const { mappings, loading: mappingsLoading, error: mappingsError } = useAllMenuPermissionMappings();

  // Every mapping across every menu, grouped by menu, for the overview
  // below — so additions are visible without picking each menu one by one
  // from the selector above.
  const mappingsByMenu = useMemo(() => {
    const groups = new Map<number, { menuId: number; menuName: string; permissions: { permissionId: number; permissionName: string; permissionKey: string }[] }>();
    for (const mapping of mappings) {
      const group = groups.get(mapping.menuId) ?? { menuId: mapping.menuId, menuName: mapping.menuName, permissions: [] };
      group.permissions.push({
        permissionId: mapping.permissionId,
        permissionName: mapping.permissionName,
        permissionKey: mapping.permissionKey,
      });
      groups.set(mapping.menuId, group);
    }
    return [...groups.values()].sort((a, b) => a.menuName.localeCompare(b.menuName));
  }, [mappings]);

  // The checkbox selection, seeded from the currently-mapped permissions
  // whenever the menu selection changes or the mapped set changes (e.g.
  // after a save refetches it). Keyed on content rather than array identity,
  // since `mappedPermissionIds` is a new array every render.
  const [checkedIds, setCheckedIds] = useState<number[]>([]);
  const [syncedFor, setSyncedFor] = useState<string | null>(null);
  const selectionKey = menuId ? `${menuId}:${sortedKey(mappedPermissionIds)}` : null;

  useEffect(() => {
    if (selectionKey && selectionKey !== syncedFor) {
      setCheckedIds(mappedPermissionIds);
      setSyncedFor(selectionKey);
    }
  }, [selectionKey, syncedFor, mappedPermissionIds]);

  const handleMenuChange = (value: string) => {
    setMenuId(value);
  };

  const togglePermission = (permissionId: number, checked: boolean) => {
    setCheckedIds((prev) => (checked ? [...prev, permissionId] : prev.filter((id) => id !== permissionId)));
  };

  const isDirty = sortedKey(checkedIds) !== sortedKey(mappedPermissionIds);
  const loading = mappedLoading || permissionsLoading;

  const handleSave = async () => {
    if (!menuId) return;
    await saveMenuPermissions({
      menuId: Number(menuId),
      permissionIds: checkedIds,
    });
  };

  return (
    <div className="space-y-4 p-5">
      <p className="text-sm text-muted-foreground">Choose which permissions are mapped to a menu.</p>

      <Card ref={editorRef}>
        <CardContent className="space-y-4 pt-6">
          {(mappedError || permissionsError) && (
            <p className="text-sm text-destructive">{(mappedError ?? permissionsError)?.message}</p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Menu</label>
              <Select value={menuId} onValueChange={handleMenuChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a menu" />
                </SelectTrigger>
                <SelectContent>
                  {menus.map((menu) => (
                    <SelectItem key={menu.menuId} value={String(menu.menuId)}>
                      {menu.menuName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {menuId && (
            <>
              {loading && <p className="text-sm text-muted-foreground">Loading…</p>}

              {!loading && (
                <div>
                  <p className="mb-2 text-sm font-medium">Permissions</p>
                  {permissions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No permissions are configured.</p>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {permissions.map((permission) => {
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
                  {saving ? "Saving…" : "Save"}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 pt-6">
          <p className="text-sm font-medium">All menu permission mappings</p>
          <p className="text-xs text-muted-foreground">
            Every menu with at least one mapped permission. Use Edit to jump to it above.
          </p>

          {mappingsError && <p className="text-sm text-destructive">{mappingsError.message}</p>}
          {mappingsLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!mappingsLoading && mappingsByMenu.length === 0 && (
            <p className="text-sm text-muted-foreground">No menus have mapped permissions yet.</p>
          )}

          <ScrollArea className="h-[420px] pr-4">
            <div className="space-y-3">
              {mappingsByMenu.map((group) => (
                <div key={group.menuId} className="rounded-md border p-3 transition-colors hover:bg-muted/50">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{group.menuName}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Edit ${group.menuName} permission mapping`}
                      onClick={() => editMenu(group.menuId)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {group.permissions.map((permission) => (
                      <Badge key={permission.permissionId} variant="secondary">
                        {permission.permissionName}
                        <span className="ml-1 text-muted-foreground">({permission.permissionKey})</span>
                      </Badge>
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
