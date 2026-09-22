import type { ReactNode } from "react";
import {
  Badge,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  ScrollArea,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@xts/design-system";
import { formatDateTime, formatUser } from "../lib/format";
import { ErrorNotice, TableEmptyRow, TableLoadingRows } from "./TableStates";

/** The bookkeeping columns every tracker (history) row has. */
interface HistoryRow {
  trackerId: number;
  createdDt: string | null;
  createdBy: number | null;
  updatedDt: string | null;
  updatedBy: number | null;
}

export interface HistoryField<T> {
  key: keyof T & string;
  label: string;
  render?: (row: T) => ReactNode;
}

/**
 * Shows a record's change history, newest first. Each row is a snapshot of
 * the record after one change, so beside every snapshot we list which fields
 * differ from the one before it — and mark the oldest as the creation.
 */
export function HistoryDialog<T extends HistoryRow>({
  open,
  onOpenChange,
  title,
  rows,
  fields,
  loading,
  error,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  rows: T[];
  fields: HistoryField<T>[];
  loading: boolean;
  error?: Error;
}) {
  const columns = fields.length + 3;

  const changedFields = (row: T, index: number): string => {
    const older = rows[index + 1];
    if (!older) return "Created";
    const changed = fields.filter((f) => row[f.key] !== older[f.key]).map((f) => f.label);
    return changed.length ? changed.join(", ") : "No visible change";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Every change, newest first. Each row is the record as it stood after that change.</DialogDescription>
        </DialogHeader>

        {error && <ErrorNotice error={error} title="Couldn't load the history" />}

        <ScrollArea className="max-h-[60vh]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>By</TableHead>
                <TableHead>What changed</TableHead>
                {fields.map((f) => (
                  <TableHead key={f.key}>{f.label}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && <TableLoadingRows columns={columns} rows={3} />}
              {!loading && !error && rows.length === 0 && (
                <TableEmptyRow columns={columns} message="No history recorded for this yet." />
              )}
              {rows.map((row, index) => (
                <TableRow key={row.trackerId}>
                  <TableCell className="whitespace-nowrap">{formatDateTime(row.updatedDt ?? row.createdDt)}</TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatUser(row.updatedBy ?? row.createdBy)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={index === rows.length - 1 ? "success" : "muted"}>{changedFields(row, index)}</Badge>
                  </TableCell>
                  {fields.map((f) => (
                    <TableCell key={f.key} className="max-w-[14rem] truncate">
                      {f.render ? f.render(row) : String(row[f.key] ?? "—")}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
