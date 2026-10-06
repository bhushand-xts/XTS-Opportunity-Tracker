import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { RfpQuestion } from "@xts/api-contracts";
import {
  Button,
  Checkbox,
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
} from "@xts/design-system";
import { useGenericMasterQuestions } from "./useGenericMasterQuestions";

// Bridges the (already real, backend-connected) Generic RFP Question Master
// into this RFP's question list — the connection the audit found missing.
export function AddFromMasterDialog({
  open,
  onOpenChange,
  existingSourceIds,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingSourceIds: Set<number>;
  onAdd: (selected: RfpQuestion[]) => void;
}) {
  const { questions, loading, error } = useGenericMasterQuestions();
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const visible = useMemo(() => {
    const text = search.trim().toLowerCase();
    return questions.filter((q) => !text || q.question.toLowerCase().includes(text));
  }, [questions, search]);

  function toggle(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleAdd() {
    onAdd(questions.filter((q) => selectedIds.has(q.id)));
    setSelectedIds(new Set());
    setSearch("");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add from Generic RFP Question Master</DialogTitle>
          <DialogDescription>
            Select reusable standard questions to add to this RFP. Already-added questions are marked and can&apos;t be
            added twice.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search master questions..."
            className="pl-9"
          />
        </div>

        {error && <p className="text-sm text-destructive">Unable to load the Generic RFP Question Master.</p>}

        <div className="max-h-80 overflow-y-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10" />
                <TableHead>Question</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={2} className="h-16 text-center text-sm text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              )}
              {!loading && visible.length === 0 && (
                <TableRow>
                  <TableCell colSpan={2} className="h-16 text-center text-sm text-muted-foreground">
                    No questions match.
                  </TableCell>
                </TableRow>
              )}
              {visible.map((q) => {
                const alreadyAdded = existingSourceIds.has(q.id);
                return (
                  <TableRow key={q.id} className={alreadyAdded ? "opacity-50" : undefined}>
                    <TableCell>
                      <Checkbox
                        checked={alreadyAdded || selectedIds.has(q.id)}
                        disabled={alreadyAdded}
                        onCheckedChange={() => toggle(q.id)}
                      />
                    </TableCell>
                    <TableCell className="text-sm">
                      {q.question}
                      {alreadyAdded && <span className="ml-2 text-xs text-muted-foreground">(already added)</span>}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={selectedIds.size === 0} onClick={handleAdd}>
            Add selected ({selectedIds.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
