import { useMemo, useState } from "react";
import { Lock, Search } from "lucide-react";
import type { ManagedUser } from "@xts/api-contracts";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  Input,
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
  useAuth,
  useSetPageTitle,
} from "@xts/design-system";
import { PageHeader } from "../../components/PageHeader";
import { ErrorNotice, TableEmptyRow, TableLoadingRows } from "../../components/TableStates";
import { useRoles } from "../role-management/useRoles";
import { useAssignUserRole } from "./useAssignUserRole";
import { useUsers } from "./useUsers";

/** Select value meaning "no role" (Radix Select can't use an empty string). */
const NO_ROLE = "none";
const COLUMNS = 5;
const MENU_KEY = "user_role_assignment";

const fullName = (u: ManagedUser) => [u.firstName, u.lastName].filter(Boolean).join(" ") || "(no name)";

export function UserRoleAssignmentPage() {
  useSetPageTitle("User Role Assignment");
  const { users, loading: usersLoading, error: usersError } = useUsers();
  const { roles, error: rolesError } = useRoles();
  const { assignRole } = useAssignUserRole();
  const { hasPermission } = useAuth();
  const canView = hasPermission(MENU_KEY, "view");
  const canEdit = hasPermission(MENU_KEY, "edit");

  const [search, setSearch] = useState("");
  // Role chosen in a row's dropdown but not saved yet, by user id (null = "no role").
  const [draft, setDraft] = useState<Record<number, number | null>>({});
  const [savingId, setSavingId] = useState<number>();

  const roleName = useMemo(() => new Map(roles.map((r) => [r.id, r.roleName])), [roles]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => `${fullName(u)} ${u.email}`.toLowerCase().includes(q));
  }, [users, search]);

  const withoutRole = users.filter((u) => u.roleId === null).length;
  const error = usersError ?? rolesError;

  const chosenRole = (u: ManagedUser): number | null => (u.id in draft ? draft[u.id] : u.roleId);

  const save = async (u: ManagedUser) => {
    const roleId = chosenRole(u);
    setSavingId(u.id);
    const message = roleId === null ? `Role removed from ${fullName(u)}.` : `${fullName(u)} is now ${roleName.get(roleId) ?? "assigned"}.`;
    const ok = await assignRole(u.id, roleId, message);
    setSavingId(undefined);
    if (ok) {
      setDraft((d) => {
        const next = { ...d };
        delete next[u.id];
        return next;
      });
    }
  };

  return (
    <div className="space-y-4 p-5">
      <PageHeader
        description="Every user has at most one role. Pick a role for a user, then press Update."
        actions={
          <div className="relative w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or email"
              aria-label="Search users"
              className="pl-9"
            />
          </div>
        }
      />

      {error && <ErrorNotice error={error} title="Couldn't load users" />}

      {!canView ? (
        <Card>
          <CardContent className="py-10">
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Lock />
                </EmptyMedia>
                <EmptyTitle>No view access</EmptyTitle>
                <EmptyDescription>Your role doesn&apos;t have permission to view User Role Assignment.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          </CardContent>
        </Card>
      ) : (
      <Card>
        <CardContent className="pt-6">
          {!usersLoading && users.length > 0 && (
            <p className="mb-3 text-xs text-muted-foreground">
              {users.length} {users.length === 1 ? "user" : "users"}
              {withoutRole > 0 ? ` · ${withoutRole} without a role` : ""}
            </p>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Current role</TableHead>
                <TableHead className="w-64">Change role</TableHead>
                <TableHead className="w-28 text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usersLoading && <TableLoadingRows columns={COLUMNS} />}
              {!usersLoading && !error && users.length === 0 && <TableEmptyRow columns={COLUMNS} message="No users yet." />}
              {!usersLoading && users.length > 0 && visible.length === 0 && (
                <TableEmptyRow columns={COLUMNS} message="No users match your search." />
              )}
              {visible.map((u) => {
                const chosen = chosenRole(u);
                const changed = chosen !== u.roleId;
                const inactive = u.isActive === false;
                const saving = savingId === u.id;
                return (
                  <TableRow key={u.id} className={inactive ? "text-muted-foreground" : undefined}>
                    <TableCell>
                      <div className="font-medium">{fullName(u)}</div>
                      <div className="text-xs text-muted-foreground">{u.email}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={inactive ? "muted" : "success"}>{inactive ? "Inactive" : "Active"}</Badge>
                    </TableCell>
                    <TableCell>
                      {u.roleId === null ? (
                        <span className="text-sm text-muted-foreground">No role</span>
                      ) : (
                        <Badge variant="default">{roleName.get(u.roleId) ?? `Role #${u.roleId} (missing)`}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={chosen === null ? NO_ROLE : String(chosen)}
                        disabled={!canEdit || inactive || saving}
                        onValueChange={(value) =>
                          setDraft((d) => ({ ...d, [u.id]: value === NO_ROLE ? null : Number(value) }))
                        }
                      >
                        <SelectTrigger aria-label={`Role for ${fullName(u)}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NO_ROLE}>No role</SelectItem>
                          {roles.map((role) => (
                            <SelectItem key={role.id} value={String(role.id)} disabled={!role.isActive && role.id !== u.roleId}>
                              {role.roleName}
                              {role.isActive ? "" : " (inactive)"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      {canEdit && (
                        <Button size="sm" disabled={!changed || inactive || saving} onClick={() => void save(u)}>
                          {saving ? "Saving…" : "Update"}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      )}
    </div>
  );
}
