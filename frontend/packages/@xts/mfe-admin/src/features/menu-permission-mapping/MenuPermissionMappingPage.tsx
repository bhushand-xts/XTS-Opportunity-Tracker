import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@apollo/client";
import { toast } from "sonner";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Checkbox,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  useSetPageTitle,
} from "@xts/design-system";
import { PageHeader } from "../../components/PageHeader";
import { ErrorNotice } from "../../components/TableStates";
import { requireUserId, runWithToast } from "../../lib/mutation";
import { useMenus } from "../menu-management/useMenus";
import { usePermissions } from "../permission-management/usePermissions";
import { GET_MENU_PERMISSIONS, SAVE_MENU_PERMISSIONS } from "./mapping.queries";

interface MenuPermissionsResult {
  menuPermissions: { permissionId: number; isActive: boolean }[];
}

function sameSet(a: Set<number>, b: Set<number>) {
  return a.size === b.size && [...a].every((id) => b.has(id));
}

export function MenuPermissionMappingPage() {
  useSetPageTitle("Menu Permission Mapping");
  const { rows, loading: menusLoading, error: menusError } = useMenus();
  const { permissions, loading: permissionsLoading, error: permissionsError } = usePermissions();

  const activeMenus = rows.filter(({ menu }) => menu.isActive);
  const activePermissions = permissions.filter((p) => p.isActive);

  const [menuId, setMenuId] = useState<number>();
  // Unsaved edits for the selected menu. Switching menus discards them.
  const [draft, setDraft] = useState<{ menuId: number; ids: Set<number> } | null>(null);

  const mapped = useQuery<MenuPermissionsResult>(GET_MENU_PERMISSIONS, {
    variables: { menuId },
    skip: menuId === undefined,
    fetchPolicy: "network-only",
  });
  const [saveMutation, { loading: saving }] = useMutation(SAVE_MENU_PERMISSIONS, {
    refetchQueries: [GET_MENU_PERMISSIONS],
    awaitRefetchQueries: true,
    // The all-menus mapping list is used on another screen (not open right now),
    // so refetching cannot reach it — drop the cached copy so it is read fresh.
    update: (cache) => {
      cache.evict({ fieldName: "menuPermissionMappings" });
      cache.gc();
    },
  });

  const saved = useMemo(
    () => new Set((mapped.data?.menuPermissions ?? []).filter((p) => p.isActive).map((p) => p.permissionId)),
    [mapped.data]
  );
  const selected = draft && draft.menuId === menuId ? draft.ids : saved;
  const dirty = draft !== null && draft.menuId === menuId && !sameSet(draft.ids, saved);

  const toggle = (permissionId: number, checked: boolean) => {
    if (menuId === undefined) return;
    const next = new Set(selected);
    if (checked) next.add(permissionId);
    else next.delete(permissionId);
    setDraft({ menuId, ids: next });
  };

  const save = async () => {
    if (menuId === undefined) return;
    if (selected.size === 0) {
      // The backend requires at least one permission per save.
      toast.error("Select at least one permission for this menu.");
      return;
    }
    const ok = await runWithToast(
      () =>
        saveMutation({ variables: { input: { menuId, permissionIds: [...selected], updatedBy: requireUserId() } } }),
      "Permissions saved for this menu.",
      "Failed to save permissions."
    );
    if (ok) setDraft(null);
  };

  const error = menusError ?? permissionsError ?? mapped.error;
  const loadingLists = menusLoading || permissionsLoading;

  return (
    <div className="space-y-4 p-5">
      <PageHeader description="Choose which permissions can be granted on each menu. Roles can only be given permissions that are mapped here." />

      {error && <ErrorNotice error={error} />}

      <Card>
        <CardContent className="space-y-6 pt-6">
          <div className="max-w-xs space-y-1.5">
            <Label htmlFor="menu-select">Menu</Label>
            {loadingLists ? (
              <Skeleton className="h-9 w-full" />
            ) : (
              <Select value={menuId === undefined ? undefined : String(menuId)} onValueChange={(v) => setMenuId(Number(v))}>
                <SelectTrigger id="menu-select">
                  <SelectValue placeholder="Select a menu" />
                </SelectTrigger>
                <SelectContent>
                  {activeMenus.map(({ menu, depth }) => (
                    <SelectItem key={menu.menuId} value={String(menu.menuId)}>
                      {depth > 0 ? "— " : ""}
                      {menu.menuName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {!loadingLists && activeMenus.length === 0 && (
              <p className="text-xs text-muted-foreground">No active menus. Add one in Menu Master first.</p>
            )}
          </div>

          {menuId !== undefined && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Allowed permissions</p>
                <Badge variant="muted">{selected.size} selected</Badge>
              </div>

              {mapped.loading ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {[0, 1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-14 w-full" />
                  ))}
                </div>
              ) : activePermissions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No active permissions. Add one in Permission Master first.</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {activePermissions.map((permission) => {
                    const id = `perm-${permission.permissionId}`;
                    return (
                      <label
                        key={permission.permissionId}
                        htmlFor={id}
                        className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-accent/50"
                      >
                        <Checkbox
                          id={id}
                          checked={selected.has(permission.permissionId)}
                          onCheckedChange={(checked) => toggle(permission.permissionId, checked === true)}
                          className="mt-0.5"
                        />
                        <span className="min-w-0">
                          <span className="block text-sm font-medium">{permission.permissionName}</span>
                          <span className="block truncate font-mono text-xs text-muted-foreground">
                            {permission.permissionKey}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 border-t pt-4">
                <Button variant="outline" disabled={!dirty || saving} onClick={() => setDraft(null)}>
                  Reset
                </Button>
                <Button disabled={!dirty || saving} onClick={() => void save()}>
                  {saving ? "Saving…" : "Save changes"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
