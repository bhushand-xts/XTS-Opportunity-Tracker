import { useState } from "react";
import { Pencil, Plus, Shield } from "lucide-react";
import type { Role } from "@xts/api-contracts";
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
import { RoleFormDialog } from "./RoleFormDialog";
import { useRoleMutations } from "./useRoleMutations";
import { useRoles } from "./useRoles";

export function RoleMasterPage() {
  useSetPageTitle("Role Master");
  const { roles, loading, error } = useRoles();
  const { toggleRoleStatus, saving } = useRoleMutations();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);

  const openAdd = () => {
    setEditingRole(null);
    setDialogOpen(true);
  };
  const openEdit = (role: Role) => {
    setEditingRole(role);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-4 p-5">
      <PageHeader
        icon={Shield}
        description="Create and manage functional user roles."
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
                <TableHead>Role Name</TableHead>
                <TableHead>Role Code</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && <TableSkeletonRows columns={4} />}
              {!loading && roles.length === 0 && (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={4} className="p-0">
                    <Empty>
                      <EmptyHeader>
                        <EmptyMedia variant="icon">
                          <Shield />
                        </EmptyMedia>
                        <EmptyTitle>No roles yet</EmptyTitle>
                        <EmptyDescription>Create a role to start assigning permissions to users.</EmptyDescription>
                      </EmptyHeader>
                      <EmptyContent>
                        <Button size="sm" onClick={openAdd}>
                          <Plus className="mr-2 size-4" />
                          Add Role
                        </Button>
                      </EmptyContent>
                    </Empty>
                  </TableCell>
                </TableRow>
              )}
              {roles.map((role) => (
                <TableRow key={role.id}>
                  <TableCell className="font-medium">{role.roleName}</TableCell>
                  <TableCell className="text-muted-foreground">{role.roleCode}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={role.isActive}
                        disabled={saving}
                        aria-label={`Toggle ${role.roleName} status`}
                        onCheckedChange={(checked) => toggleRoleStatus(role.id, role.roleName, checked)}
                      />
                      <span className="text-sm text-muted-foreground">
                        {role.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" aria-label={`Edit ${role.roleName}`} onClick={() => openEdit(role)}>
                      <Pencil className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <RoleFormDialog open={dialogOpen} onOpenChange={setDialogOpen} role={editingRole} allRoles={roles} />
    </div>
  );
}
