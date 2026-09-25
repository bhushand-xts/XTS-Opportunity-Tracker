import { useMemo, useState } from "react";
import { History, Pencil, Plus, Search, Trash2 } from "lucide-react";
import type { Role } from "@xts/api-contracts";
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
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  useMenuActionPermissions,
  useSetPageTitle,
} from "@xts/design-system";
import { PageHeader } from "../../components/PageHeader";
import { ErrorNotice, TableEmptyRow, TableLoadingRows } from "../../components/TableStates";
import { RoleFormDialog } from "./RoleFormDialog";
import { RoleHistoryDialog } from "./RoleHistoryDialog";
import { useRoleMutations } from "./useRoleMutations";
import { useRoles } from "./useRoles";

const COLUMNS = 5;

export function RoleMasterPage() {
  useSetPageTitle("Role Master");
  const { roles, loading, error } = useRoles();
  const { deleteRole } = useRoleMutations();
  const { can } = useMenuActionPermissions("role_master");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [deletingRole, setDeletingRole] = useState<Role | null>(null);
  const [historyRole, setHistoryRole] = useState<Role | null>(null);
  const [search, setSearch] = useState("");

  const visibleRoles = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return roles;
    return roles.filter((r) => `${r.roleName} ${r.roleCode ?? ""}`.toLowerCase().includes(q));
  }, [roles, search]);

  const openAdd = () => {
    setEditingRole(null);
    setDialogOpen(true);
  };
  const openEdit = (role: Role) => {
    setEditingRole(role);
    setDialogOpen(true);
  };
  const confirmDelete = async () => {
    if (!deletingRole) return;
    await deleteRole(deletingRole.id);
    setDeletingRole(null);
  };

  return (
    <div className="space-y-4 p-5">
      <PageHeader
        description="Create and manage functional user roles."
        actions={
          <>
            <div className="relative w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search role name or code"
                aria-label="Search roles"
                className="pl-9"
              />
            </div>
            {can("add") && (
              <Button onClick={openAdd}>
                <Plus className="mr-2 size-4" />
                Add role
              </Button>
            )}
          </>
        }
      />

      {error && <ErrorNotice error={error} title="Couldn't load roles" />}

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && <TableLoadingRows columns={COLUMNS} />}
              {!loading && !error && roles.length === 0 && (
                <TableEmptyRow columns={COLUMNS} message="No roles yet. Add the first one." />
              )}
              {!loading && roles.length > 0 && visibleRoles.length === 0 && (
                <TableEmptyRow columns={COLUMNS} message="No roles match your search." />
              )}
              {visibleRoles.map((role) => (
                <TableRow key={role.id}>
                  <TableCell className="font-medium">{role.roleName}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{role.roleCode ?? "—"}</TableCell>
                  <TableCell className="max-w-xs truncate text-muted-foreground">{role.description ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={role.isActive ? "success" : "muted"}>{role.isActive ? "Active" : "Inactive"}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`History of ${role.roleName}`}
                      onClick={() => setHistoryRole(role)}
                    >
                      <History className="size-4" />
                    </Button>
                    {can("edit") && (
                      <Button variant="ghost" size="icon" aria-label={`Edit ${role.roleName}`} onClick={() => openEdit(role)}>
                        <Pencil className="size-4" />
                      </Button>
                    )}
                    {can("delete") && (
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Delete ${role.roleName}`}
                        onClick={() => setDeletingRole(role)}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <RoleFormDialog open={dialogOpen} onOpenChange={setDialogOpen} role={editingRole} allRoles={roles} />
      <RoleHistoryDialog role={historyRole} onClose={() => setHistoryRole(null)} />

      <AlertDialog open={deletingRole !== null} onOpenChange={(open) => !open && setDeletingRole(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete role?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &quot;{deletingRole?.roleName}&quot;. A role that is still assigned to users
              cannot be deleted.
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
