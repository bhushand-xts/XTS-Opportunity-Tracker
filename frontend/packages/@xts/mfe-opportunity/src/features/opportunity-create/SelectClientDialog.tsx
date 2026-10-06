import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  useStore,
  type Customer,
} from "@xts/design-system";

// The gate in front of Step 1 — pick an existing client or start fresh. Pure
// selection UI, no navigation of its own: the caller decides what "picked an
// existing client" and "start a new one" actually do (PipelineBoard routes
// to Step 1 either way; Step 1's own "Change client" just swaps the client
// in place without leaving the page).
export function SelectClientDialog({
  open,
  onOpenChange,
  onSelectClient,
  onNewClient,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectClient: (customer: Customer) => void;
  onNewClient: () => void;
}) {
  const { customers } = useStore();
  const [search, setSearch] = useState("");

  const visible = useMemo(() => {
    const text = search.trim().toLowerCase();
    if (!text) return customers;
    return customers.filter((c) => c.name.toLowerCase().includes(text));
  }, [customers, search]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setSearch("");
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Select a client</DialogTitle>
          <DialogDescription>Choose the client this opportunity is for, or add a new one.</DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search clients..."
            className="pl-9"
            autoFocus
          />
        </div>

        <div className="max-h-80 overflow-y-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Relationship</TableHead>
                <TableHead>Account type</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="h-20 text-center text-sm text-muted-foreground">
                    No clients yet. Add one to get started.
                  </TableCell>
                </TableRow>
              )}
              {customers.length > 0 && visible.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="h-20 text-center text-sm text-muted-foreground">
                    No clients match your search.
                  </TableCell>
                </TableRow>
              )}
              {visible.map((c) => (
                <TableRow key={c.id} className="cursor-pointer" onClick={() => onSelectClient(c)}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">{c.relationship}</TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">{c.accountType}</TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {[c.city, c.state].filter(Boolean).join(", ") || "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectClient(c);
                      }}
                    >
                      Select
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={onNewClient}>
            <Plus className="mr-2 size-4" />
            New client
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
