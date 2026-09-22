import { useState } from "react";
import { Key, Pencil, Plus } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  PageHeader,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableSkeletonRows,
  useSetPageTitle,
} from "@xts/design-system";
import { PermissionFormDialog } from "./PermissionFormDialog";
import { usePermissionMutations } from "./usePermissionMutations";
import { usePermissions, type Permission } from "./usePermissions";

export function PermissionMasterPage() {
  useSetPageTitle("Permission Master");
  const { permissions, loading, error } = usePermissions();
  const { togglePermissionStatus, saving } = usePermissionMutations();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPermission, setEditingPermission] = useState<Permission | null>(null);

  const openAdd = () => {
    setEditingPermission(null);
    setDialogOpen(true);
  };
  const openEdit = (permission: Permission) => {
    setEditingPermission(permission);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-4 p-5">
      <PageHeader
        icon={Key}
        description="Manage module-level access and action permissions."
        actions={
          <Button onClick={openAdd}>
            <Plus className="mr-2 size-4" />
            Add
          </Button>
        }
      />

      <Card>
        <CardContent className="pt-6">
          {error && <p className="mb-4 text-sm text-destructive">{error.message}</p>}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Permission Name</TableHead>
                <TableHead>Permission Key</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && <TableSkeletonRows columns={5} />}
              {!loading && permissions.length === 0 && (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={5} className="p-0">
                    <Empty>
                      <EmptyHeader>
                        <EmptyMedia variant="icon">
                          <Key />
                        </EmptyMedia>
                        <EmptyTitle>No permissions yet</EmptyTitle>
                        <EmptyDescription>Add a permission to start managing module-level access.</EmptyDescription>
                      </EmptyHeader>
                      <EmptyContent>
                        <Button size="sm" onClick={openAdd}>
                          <Plus className="mr-2 size-4" />
                          Add Permission
                        </Button>
                      </EmptyContent>
                    </Empty>
                  </TableCell>
                </TableRow>
              )}
              {permissions.map((permission) => (
                <TableRow key={permission.permissionId}>
                  <TableCell className="font-medium">{permission.permissionName}</TableCell>
                  <TableCell className="text-muted-foreground">{permission.permissionKey}</TableCell>
                  <TableCell className="text-muted-foreground">{permission.description ?? "—"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={permission.isActive}
                        disabled={saving}
                        aria-label={`Toggle ${permission.permissionName} status`}
                        onCheckedChange={(checked) => togglePermissionStatus(permission.permissionId, checked)}
                      />
                      <span className="text-sm text-muted-foreground">
                        {permission.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
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
