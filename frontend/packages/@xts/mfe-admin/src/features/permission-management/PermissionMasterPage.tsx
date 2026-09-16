import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import type { Permission } from "@xts/api-contracts";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
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
import { usePermissions } from "./usePermissions";

export function PermissionMasterPage() {
  useSetPageTitle("Permission Master");
  const { permissions, loading, error } = usePermissions();
  const { deletePermission } = usePermissionMutations();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPermission, setEditingPermission] = useState<Permission | null>(null);
  const [deletingPermission, setDeletingPermission] = useState<Permission | null>(null);

  const openAdd = () => {
    setEditingPermission(null);
    setDialogOpen(true);
  };
  const openEdit = (permission: Permission) => {
    setEditingPermission(permission);
    setDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingPermission) return;
    await deletePermission(deletingPermission.id);
    setDeletingPermission(null);
  };

  return (
    <div className="space-y-4 p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Manage module-level access and action permissions.</p>
        <Button onClick={openAdd}>
          <Plus className="mr-2 size-4" />
          Add
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {error && <p className="mb-4 text-sm text-destructive">{error.message}</p>}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Permission Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-sm text-muted-foreground">
                    Loading permissions…
                  </TableCell>
                </TableRow>
              )}
              {!loading && permissions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-sm text-muted-foreground">
                    No permissions yet.
                  </TableCell>
                </TableRow>
              )}
              {permissions.map((permission) => (
                <TableRow key={permission.id}>
                  <TableCell className="font-medium">{permission.permissionName}</TableCell>
                  <TableCell>
                    <Badge variant={permission.isActive ? "success" : "muted"}>
                      {permission.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Edit ${permission.permissionName}`}
                      onClick={() => openEdit(permission)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Delete ${permission.permissionName}`}
                      onClick={() => setDeletingPermission(permission)}
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

      <PermissionFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        permission={editingPermission}
        allPermissions={permissions}
      />

      <AlertDialog open={deletingPermission !== null} onOpenChange={(open) => !open && setDeletingPermission(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete permission?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deletingPermission?.permissionName}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
