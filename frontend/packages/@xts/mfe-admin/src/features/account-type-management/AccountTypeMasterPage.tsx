import { useMemo, useState } from "react";
import { Lock, Pencil, Plus, Search } from "lucide-react";
import type { AccountType } from "@xts/api-contracts";
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
import {
  ErrorNotice,
  TableEmptyRow,
  TableLoadingRows,
} from "../../components/TableStates";
import { AccountTypeFormDialog } from "./AccountTypeFormDialog";
import { useAccountTypes } from "./useAccountTypes";
import { useAccountTypeMutations } from "./useAccountTypeMutations";

const COLUMNS = 5;
const MENU_KEY = "account_type_master";

export function AccountTypeMasterPage() {
  useSetPageTitle("Account Type Master");

  const { accountTypes, loading, error } = useAccountTypes();
  const { setAccountTypeActive } = useAccountTypeMutations();
  const { hasPermission } = useAuth();
  const canView = hasPermission(MENU_KEY, "view");
  const canAdd = hasPermission(MENU_KEY, "add");
  const canEdit = hasPermission(MENU_KEY, "edit");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAccountType, setEditingAccountType] = useState<AccountType | null>(null);
  const [search, setSearch] = useState("");

  const visibleAccountTypes = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return accountTypes;

    return accountTypes.filter((accountType) =>
      `${accountType.accountName} ${accountType.description ?? ""}`
        .toLowerCase()
        .includes(query)
    );
  }, [accountTypes, search]);

  function openAdd() {
    setEditingAccountType(null);
    setDialogOpen(true);
  }

  function openEdit(accountType: AccountType) {
    setEditingAccountType(accountType);
    setDialogOpen(true);
  }

  return (
    <div className="space-y-4 p-5">
      <PageHeader
        description="Create and manage account types."
        actions={
          <>
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search account types"
                aria-label="Search account types"
                className="pl-9"
              />
            </div>

            {canAdd && (
              <Button onClick={openAdd}>
                <Plus className="mr-2 size-4" />
                Add account type
              </Button>
            )}
          </>
        }
      />

      {error && (
        <ErrorNotice error={error} title="Couldn't load account types" />
      )}

      {!canView ? (
        <Card>
          <CardContent className="py-10">
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Lock />
                </EmptyMedia>
                <EmptyTitle>No view access</EmptyTitle>
                <EmptyDescription>Your role doesn&apos;t have permission to view Account Type Master.</EmptyDescription>
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
                  <TableHead>Account name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="text-right">Edit</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading && <TableLoadingRows columns={COLUMNS} />}

                {!loading && !error && accountTypes.length === 0 && (
                  <TableEmptyRow
                    columns={COLUMNS}
                    message="No account types yet. Add the first one."
                  />
                )}

                {!loading &&
                  accountTypes.length > 0 &&
                  visibleAccountTypes.length === 0 && (
                    <TableEmptyRow
                      columns={COLUMNS}
                      message="No account types match your search."
                    />
                  )}

                {visibleAccountTypes.map((accountType) => (
                  <TableRow key={accountType.accountTypeId}>
                    <TableCell className="font-medium">
                      {accountType.accountName}
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">
                      {accountType.description ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={accountType.isActive ? "success" : "muted"}
                      >
                        {accountType.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={accountType.isActive}
                        disabled={!canEdit}
                        aria-label={`${accountType.isActive ? "Deactivate" : "Activate"} ${accountType.accountName}`}
                        onCheckedChange={(checked) =>
                          void setAccountTypeActive(accountType.accountTypeId, checked)
                        }
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Edit ${accountType.accountName}`}
                          onClick={() => openEdit(accountType)}
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

      <AccountTypeFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        accountType={editingAccountType}
        allAccountTypes={accountTypes}
      />
    </div>
  );
}
