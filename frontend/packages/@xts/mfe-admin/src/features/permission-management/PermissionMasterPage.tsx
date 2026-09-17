import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  useSetPageTitle,
} from "@xts/design-system";
import { PermissionFormDialog } from "./PermissionFormDialog";
import { usePermissionMutations } from "./usePermissionMutations";
import { usePermissions, type PermissionListItem } from "./usePermissions";

export function PermissionMasterPage() {
  useSetPageTitle("Permission Master");
  const { permissions, loading, error } = usePermissions();
  const { deletePermission } = usePermissionMutations();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPermission, setEditingPermission] = useState<PermissionListItem | null>(null);

  const openAdd = () => {
    setEditingPermission(null);
    setDialogOpen(true);
  };
  const openEdit = (permission: PermissionListItem) => {
    setEditingPermission(permission);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-4 p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Manage module-level access and action permissions.</p>
        <div className="flex items-center gap-3">
          <p className="text-xs text-muted-foreground">
            Adding, editing, and deleting permissions isn&apos;t available yet — the backend hasn&apos;t implemented it.
          </p>
          <Button onClick={openAdd} disabled>
            <Plus className="mr-2 size-4" />
            Add
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          {error && <p className="mb-4 text-sm text-destructive">{error.message}</p>}
          <p className="mb-4 text-xs text-muted-foreground">
            The backend currently only exposes permission IDs — permission names, status, and management actions
            aren&apos;t available yet.
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Permission ID</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={2} className="text-center text-sm text-muted-foreground">
                    Loading permissions…
                  </TableCell>
                </TableRow>
              )}
              {!loading && permissions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={2} className="text-center text-sm text-muted-foreground">
                    No permissions yet.
                  </TableCell>
                </TableRow>
              )}
              {permissions.map((permission) => (
                <TableRow key={permission.id}>
                  <TableCell className="font-medium">{permission.id}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Edit permission ${permission.id}`}
                      disabled
                      onClick={() => openEdit(permission)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Delete permission ${permission.id}`}
                      disabled
                      onClick={() => deletePermission()}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <PermissionFormDialog open={dialogOpen} onOpenChange={setDialogOpen} permission={editingPermission} />
    </div>
  );
}
