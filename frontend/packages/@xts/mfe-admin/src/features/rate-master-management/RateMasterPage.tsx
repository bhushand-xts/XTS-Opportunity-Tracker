import { useMemo, useState } from "react";
import { Pencil, Plus, Search } from "lucide-react";
import type { RateMaster } from "@xts/api-contracts";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Input,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  useSetPageTitle,
} from "@xts/design-system";
import { PageHeader } from "../../components/PageHeader";
import {
  ErrorNotice,
  TableEmptyRow,
  TableLoadingRows,
} from "../../components/TableStates";
import { RateMasterFormDialog } from "./RateMasterFormDialog";
import { useRateMasters } from "./useRateMasters";
import { useRateMasterMutations } from "./useRateMasterMutations";
import { useCurrencies } from "../currency-management/useCurrencies";

const COLUMNS = 8;

export function RateMasterPage() {
  useSetPageTitle("Technical Roles and Rate Master");

  const { rateMasters, loading, error } = useRateMasters();
  const { setRateMasterActive } = useRateMasterMutations();
  const { currencies } = useCurrencies();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRateMaster, setEditingRateMaster] =
    useState<RateMaster | null>(null);
  const [search, setSearch] = useState("");

  const getCurrency = (currencyId: number) =>
    currencies.find((currency) => currency.currencyId === currencyId);

  const visibleRateMasters = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return rateMasters;

    return rateMasters.filter((rateMaster) => {
      const currency = currencies.find(
        (item) => item.currencyId === rateMaster.currencyId
      );

      return `${rateMaster.roleName}
        ${rateMaster.roleCode}
        ${currency?.currencyName ?? ""}
        ${currency?.currencyId ?? ""}
        ${rateMaster.rateType}
        ${rateMaster.location ?? ""}`
        .toLowerCase()
        .includes(query);
    });
  }, [rateMasters, search, currencies]);

  function openAdd() {
    setEditingRateMaster(null);
    setDialogOpen(true);
  }

  function openEdit(rateMaster: RateMaster) {
    setEditingRateMaster(rateMaster);
    setDialogOpen(true);
  }

  return (
    <div className="space-y-4 p-5">
      <PageHeader
        description="Create and manage technical roles and their default rates."
        actions={
          <>
            <div className="relative w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search technical roles"
                aria-label="Search technical roles"
                className="pl-9"
              />
            </div>

            <Button onClick={openAdd}>
              <Plus className="mr-2 size-4" />
              Add rate
            </Button>
          </>
        }
      />

      {error && (
        <ErrorNotice error={error} title="Couldn't load rate masters" />
      )}

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Technical role</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Currency</TableHead>
                <TableHead>Rate type</TableHead>
                <TableHead>Default rate</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading && <TableLoadingRows columns={COLUMNS} />}

              {!loading && !error && rateMasters.length === 0 && (
                <TableEmptyRow
                  columns={COLUMNS}
                  message="No rate masters yet. Add the first one."
                />
              )}

              {!loading &&
                rateMasters.length > 0 &&
                visibleRateMasters.length === 0 && (
                  <TableEmptyRow
                    columns={COLUMNS}
                    message="No rate masters match your search."
                  />
                )}

              {visibleRateMasters.map((rateMaster) => {
                const currency = getCurrency(rateMaster.currencyId);

                return (
                  <TableRow key={rateMaster.ratemasterId}>
                    <TableCell className="font-medium">
                      {rateMaster.roleName}
                    </TableCell>

                    <TableCell className="font-mono text-xs">
                      {rateMaster.roleCode}
                    </TableCell>

                    <TableCell>
                      {currency
                        ? `${currency.currencyName} (${currency.currencyCode})`
                        : "—"}
                    </TableCell>

                    <TableCell>{rateMaster.rateType}</TableCell>

                    <TableCell>{rateMaster.defaultRate}</TableCell>

                    <TableCell>
                      {rateMaster.location ?? "—"}
                    </TableCell>

                    <TableCell>
                      <Badge
                        variant={
                          rateMaster.isActive ? "success" : "muted"
                        }
                      >
                        {rateMaster.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-right">
                      <Switch
                        checked={rateMaster.isActive}
                        aria-label={`${rateMaster.isActive ? "Deactivate" : "Activate"} ${rateMaster.roleName}`}
                        onCheckedChange={(checked) =>
                          void setRateMasterActive(
                            rateMaster.ratemasterId,
                            checked
                          )
                        }
                      />

                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Edit ${rateMaster.roleName}`}
                        onClick={() => openEdit(rateMaster)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <RateMasterFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        rateMaster={editingRateMaster}
      />
    </div>
  );
}