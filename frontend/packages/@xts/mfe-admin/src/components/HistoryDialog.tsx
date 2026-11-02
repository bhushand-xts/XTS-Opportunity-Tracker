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
 * Shows previous versions, newest first, with differences between consecutive
 * saved versions. Current values belong to the main record.
 */
export function HistoryDialog<T extends HistoryRow>({
  open,
  onOpenChange,
  title,
  rows,
  fields,
  loading,
  error,
  resolveUser = formatUser,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  rows: T[];
  fields: HistoryField<T>[];
  loading: boolean;
  error?: Error;
  /** Turns a user id into a display name. Defaults to "User #<id>" when not given. */
  resolveUser?: (userId: number | null | undefined) => string;
}) {
  const columns = fields.length + 3;

  const changedFields = (row: T, index: number): string => {
    const older = rows[index + 1];
    if (!older) return "Oldest saved version";
    const changed = fields.filter((f) => row[f.key] !== older[f.key]).map((f) => f.label);
    return changed.length ? changed.join(", ") : "No visible change";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Previous versions, newest first.</DialogDescription>
        </DialogHeader>

        {error && <ErrorNotice error={error} title="Couldn't load the history" />}

        {/* overflow-x-auto is the safety net for however many feature-specific
            fields a given history has — ScrollArea below only handles the
            vertical (max-height) side, so without this the table just got
            clipped at the dialog's edge instead of being reachable at all. */}
        <ScrollArea className="max-h-[60vh] overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Version saved</TableHead>
                <TableHead>Saved by</TableHead>
                <TableHead>Differences from older version</TableHead>
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
                    {resolveUser(row.updatedBy ?? row.createdBy)}
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
