import { useState } from "react";
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
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
import { useRoles } from "../role-management/useRoles";
import { useRoleMenuPermissions } from "./useRoleMenuPermissions";
import { useSaveRoleMenuPermissions } from "./useSaveRoleMenuPermissions";

export function RoleMenuPermissionAssignmentPage() {
  useSetPageTitle("Role-Menu-Permission Assignment");
  const { roles } = useRoles();
  const activeRoles = roles.filter((r) => r.isActive);

  const [roleId, setRoleId] = useState<string>();
  const { roleMenuIds, rolePermissionIds, loading } = useRoleMenuPermissions(roleId);
  const { saveRoleMenuPermissions } = useSaveRoleMenuPermissions();

  const handleSave = async () => {
    await saveRoleMenuPermissions();
  };

  return (
    <div className="space-y-4 p-5">
      <p className="text-sm text-muted-foreground">Map menus and granular permissions to a functional role.</p>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <Alert>
            <AlertDescription>
              Assigning menus and permissions to a role isn&apos;t available yet — the backend hasn&apos;t implemented
              role-menu-permission linkage. Only bare menu and permission IDs exist server-side today, with no
              per-role mapping between them.
            </AlertDescription>
          </Alert>

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
              {loading && <p className="text-sm text-muted-foreground">Loading…</p>}

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="mb-2 text-sm font-medium">Menu IDs</p>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {roleMenuIds.length === 0 && (
                        <TableRow>
                          <TableCell className="text-center text-sm text-muted-foreground">No data.</TableCell>
                        </TableRow>
                      )}
                      {roleMenuIds.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.id}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div>
                  <p className="mb-2 text-sm font-medium">Permission IDs</p>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rolePermissionIds.length === 0 && (
                        <TableRow>
                          <TableCell className="text-center text-sm text-muted-foreground">No data.</TableCell>
                        </TableRow>
                      )}
                      {rolePermissionIds.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.id}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3">
                <p className="text-xs text-muted-foreground">Saving isn&apos;t available yet.</p>
                <Button onClick={handleSave} disabled>
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
