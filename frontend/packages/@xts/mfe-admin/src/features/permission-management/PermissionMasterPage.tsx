import { useMemo, useState } from "react";
import { History, Lock, Pencil, Plus, Search } from "lucide-react";
import type { Permission } from "@xts/api-contracts";
import {
  Button,
  Card,
  CardContent,
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  Input,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  useAuth,
  useSetPageTitle,
} from "@xts/design-system";
import { PageHeader } from "../../components/PageHeader";
import { ErrorNotice, TableEmptyRow, TableLoadingRows } from "../../components/TableStates";
import { PermissionFormDialog } from "./PermissionFormDialog";
import { PermissionHistoryDialog } from "./PermissionHistoryDialog";
import { usePermissionMutations } from "./usePermissionMutations";
import { usePermissions } from "./usePermissions";

const COLUMNS = 5;
const MENU_KEY = "permission_master";

export function PermissionMasterPage() {
  useSetPageTitle("Permission Master");
  const { permissions, loading, error } = usePermissions();
  const { setPermissionActive } = usePermissionMutations();
  const { hasPermission } = useAuth();
  const canView = hasPermission(MENU_KEY, "view");
  const canAdd = hasPermission(MENU_KEY, "add");
  const canEdit = hasPermission(MENU_KEY, "edit");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPermission, setEditingPermission] = useState<Permission | null>(null);
  const [historyPermission, setHistoryPermission] = useState<Permission | null>(null);
  const [search, setSearch] = useState("");

  const visiblePermissions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return permissions;
    return permissions.filter((p) => `${p.permissionName} ${p.permissionKey}`.toLowerCase().includes(q));
  }, [permissions, search]);

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
        description="Manage the actions that can be granted on a menu, such as view, create or export."
        actions={
          <>
            <div className="relative w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search permission name or key"
                aria-label="Search permissions"
                className="pl-9"
              />
            </div>
            {canAdd && (
              <Button onClick={openAdd}>
                <Plus className="mr-2 size-4" />
                Add permission
              </Button>
            )}
          </>
        }
      />

      {error && <ErrorNotice error={error} title="Couldn't load permissions" />}

      {!canView ? (
        <Card>
          <CardContent className="py-10">
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Lock />
                </EmptyMedia>
                <EmptyTitle>No view access</EmptyTitle>
                <EmptyDescription>Your role doesn&apos;t have permission to view Permission Master.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Permission</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-24">Active</TableHead>
                  <TableHead className="w-28 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && <TableLoadingRows columns={COLUMNS} />}
                {!loading && !error && permissions.length === 0 && (
                  <TableEmptyRow columns={COLUMNS} message="No permissions yet. Add the first one." />
                )}
                {!loading && permissions.length > 0 && visiblePermissions.length === 0 && (
                  <TableEmptyRow columns={COLUMNS} message="No permissions match your search." />
                )}
                {visiblePermissions.map((permission) => (
                  <TableRow
                    key={permission.permissionId}
                    className={permission.isActive ? undefined : "text-muted-foreground"}
                  >
                    <TableCell className="font-medium">{permission.permissionName}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{permission.permissionKey}</TableCell>
                    <TableCell className="max-w-sm truncate text-muted-foreground">
                      {permission.description ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={permission.isActive}
                        disabled={!canEdit}
                        aria-label={`${permission.isActive ? "Deactivate" : "Activate"} ${permission.permissionName}`}
                        onCheckedChange={(checked) => void setPermissionActive(permission.permissionId, checked)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`History of ${permission.permissionName}`}
                        onClick={() => setHistoryPermission(permission)}
                      >
                        <History className="size-4" />
                      </Button>
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Edit ${permission.permissionName}`}
                          onClick={() => openEdit(permission)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <PermissionFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        permission={editingPermission}
        allPermissions={permissions}
      />
      <PermissionHistoryDialog permission={historyPermission} onClose={() => setHistoryPermission(null)} />
    </div>
  );
}
