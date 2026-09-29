import { useMemo, useState } from "react";
import { Pencil, Plus, Search } from "lucide-react";
import type { Currency } from "@xts/api-contracts";
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
import { CurrencyFormDialog } from "./CurrencyFormDialog";
import { useCurrencies } from "./useCurrencies";
import { useCurrencyMutations } from "./useCurrencyMutations";

const COLUMNS = 6;

export function CurrencyMasterPage() {
  useSetPageTitle("Currency Master");

  const { currencies, loading, error } = useCurrencies();
  const { setCurrencyActive } = useCurrencyMutations();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCurrency, setEditingCurrency] = useState<Currency | null>(null);
  const [search, setSearch] = useState("");

  const visibleCurrencies = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return currencies;

    return currencies.filter((currency) =>
      `${currency.currencyName} ${currency.currencyCode} ${currency.currencySymbol}`
        .toLowerCase()
        .includes(query)
    );
  }, [currencies, search]);

  function openAdd() {
    setEditingCurrency(null);
    setDialogOpen(true);
  }

  function openEdit(currency: Currency) {
    setEditingCurrency(currency);
    setDialogOpen(true);
  }

  return (
    <div className="space-y-4 p-5">
      <PageHeader
        description="Create and manage currencies used in estimation."
        actions={
          <>
            <div className="relative w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search currencies"
                aria-label="Search currencies"
                className="pl-9"
              />
            </div>

            <Button onClick={openAdd}>
              <Plus className="mr-2 size-4" />
              Add currency
            </Button>
          </>
        }
      />

      {error && (
        <ErrorNotice error={error} title="Couldn't load currencies" />
      )}

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Currency name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Symbol</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="text-right">Edit</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading && <TableLoadingRows columns={COLUMNS} />}

              {!loading && !error && currencies.length === 0 && (
                <TableEmptyRow
                  columns={COLUMNS}
                  message="No currencies yet. Add the first one."
                />
              )}

              {!loading &&
                currencies.length > 0 &&
                visibleCurrencies.length === 0 && (
                  <TableEmptyRow
                    columns={COLUMNS}
                    message="No currencies match your search."
                  />
                )}

              {visibleCurrencies.map((currency) => (
                <TableRow key={currency.currencyId}>
                  <TableCell className="font-medium">
                    {currency.currencyName}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {currency.currencyCode}
                  </TableCell>
                  <TableCell>{currency.currencySymbol}</TableCell>
                  <TableCell>
                    <Badge
                      variant={currency.isActive ? "success" : "muted"}
                    >
                      {currency.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={currency.isActive}
                      aria-label={`${currency.isActive ? "Deactivate" : "Activate"} ${currency.currencyName}`}
                      onCheckedChange={(checked) =>
                        void setCurrencyActive(currency.currencyId, checked)
                      }
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Edit ${currency.currencyName}`}
                      onClick={() => openEdit(currency)}
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

      <CurrencyFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        currency={editingCurrency}
        allCurrencies={currencies}
      />
    </div>
  );
}