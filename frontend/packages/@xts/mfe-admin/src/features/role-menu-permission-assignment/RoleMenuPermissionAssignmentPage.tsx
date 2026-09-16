import { useEffect, useState } from "react";
import type { Menu, RoleMenuPermissionInput } from "@xts/api-contracts";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  useSetPageTitle,
} from "@xts/design-system";
import { useMenus } from "../menu-management/useMenus";
import { useRoles } from "../role-management/useRoles";
import { useRoleMenuPermissions } from "./useRoleMenuPermissions";
import { useSaveRoleMenuPermissions } from "./useSaveRoleMenuPermissions";

interface MatrixRow {
  checked: boolean;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canExport: boolean;
}

const EMPTY_ROW: MatrixRow = {
  checked: false,
  canView: false,
  canCreate: false,
  canEdit: false,
  canDelete: false,
  canExport: false,
};

/** Main menus first (by display order), each followed immediately by its
 * own sub-menus (also by display order) so the matrix reads as a hierarchy,
 * matching how Menu Master itself groups menus. */
function orderMenusHierarchically(menus: Menu[]): Array<{ menu: Menu; indent: boolean }> {
  const mains = menus.filter((m) => m.menuType === "MAIN_MENU").sort((a, b) => a.displayOrder - b.displayOrder);
  const rows: Array<{ menu: Menu; indent: boolean }> = [];
  for (const main of mains) {
    rows.push({ menu: main, indent: false });
    const children = menus
      .filter((m) => m.parentMenuId === main.id)
      .sort((a, b) => a.displayOrder - b.displayOrder);
    for (const child of children) rows.push({ menu: child, indent: true });
  }
  return rows;
}

export function RoleMenuPermissionAssignmentPage() {
  useSetPageTitle("Role-Menu-Permission Assignment");
  const { roles } = useRoles();
  const { menus } = useMenus();
  const activeRoles = roles.filter((r) => r.isActive);
  const menuRows = orderMenusHierarchically(menus.filter((m) => m.isActive));

  const [roleId, setRoleId] = useState<string>();
  const { entries, loading } = useRoleMenuPermissions(roleId);
  const { saveRoleMenuPermissions, saving } = useSaveRoleMenuPermissions();

  const [matrix, setMatrix] = useState<Record<string, MatrixRow>>({});
  const [formError, setFormError] = useState<string>();

  // Reset the matrix from this role's saved mapping whenever the selected
  // role changes (or its data finishes loading) — not on every render.
  useEffect(() => {
    if (!roleId) {
      setMatrix({});
      return;
    }
    const next: Record<string, MatrixRow> = {};
    for (const entry of entries) {
      next[entry.menuId] = {
        checked: true,
        canView: entry.canView,
        canCreate: entry.canCreate,
        canEdit: entry.canEdit,
        canDelete: entry.canDelete,
        canExport: entry.canExport,
      };
    }
    setMatrix(next);
    setFormError(undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleId, loading]);

  const rowFor = (menuId: string): MatrixRow => matrix[menuId] ?? EMPTY_ROW;

  const setMenuChecked = (menuId: string, checked: boolean) => {
    setMatrix((prev) => ({
      ...prev,
      // Unchecking a menu clears its permissions too — permissions can't
      // apply to a menu the role no longer has access to.
      [menuId]: checked ? { ...rowFor(menuId), checked: true } : EMPTY_ROW,
    }));
  };

  const setPermission = (menuId: string, key: keyof Omit<MatrixRow, "checked">, value: boolean) => {
    setMatrix((prev) => ({ ...prev, [menuId]: { ...rowFor(menuId), checked: true, [key]: value } }));
  };

  const handleSave = async () => {
    if (!roleId) {
      setFormError("Select a role first.");
      return;
    }
    const checkedEntries: RoleMenuPermissionInput[] = Object.entries(matrix)
      .filter(([, row]) => row.checked)
      .map(([menuId, row]) => ({
        menuId,
        canView: row.canView,
        canCreate: row.canCreate,
        canEdit: row.canEdit,
        canDelete: row.canDelete,
        canExport: row.canExport,
      }));

    if (checkedEntries.length === 0) {
      setFormError("Select at least one menu before saving.");
      return;
    }
    setFormError(undefined);

    const hadExistingEntries = entries.length > 0;
    await saveRoleMenuPermissions(roleId, checkedEntries, hadExistingEntries);
  };

  return (
    <div className="space-y-4 p-5">
      <p className="text-sm text-muted-foreground">Map menus and granular permissions to a functional role.</p>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="max-w-xs space-y-1.5">
            <label className="text-sm font-medium">Role</label>
            <Select value={roleId} onValueChange={setRoleId}>
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

          {roleId && (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Menu</TableHead>
                    <TableHead className="text-center">View</TableHead>
                    <TableHead className="text-center">Create</TableHead>
                    <TableHead className="text-center">Edit</TableHead>
                    <TableHead className="text-center">Delete</TableHead>
                    <TableHead className="text-center">Export</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {menuRows.map(({ menu, indent }) => {
                    const row = rowFor(menu.id);
                    return (
                      <TableRow key={menu.id}>
                        <TableCell className={indent ? "pl-8" : "font-medium"}>
                          <label className="flex items-center gap-2">
                            <Checkbox
                              checked={row.checked}
                              onCheckedChange={(checked) => setMenuChecked(menu.id, checked === true)}
                            />
                            {menu.menuName}
                          </label>
                        </TableCell>
                        {(["canView", "canCreate", "canEdit", "canDelete", "canExport"] as const).map((key) => (
                          <TableCell key={key} className="text-center">
                            <Checkbox
                              checked={row[key]}
                              disabled={!row.checked}
                              onCheckedChange={(checked) => setPermission(menu.id, key, checked === true)}
                            />
                          </TableCell>
                        ))}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {formError && <p className="text-sm text-destructive">{formError}</p>}

              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={saving}>
                  Save / Assign
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
