import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, Skeleton, TableCell, TableRow } from "@xts/design-system";

/** Placeholder rows shown while a table's data is loading. */
export function TableLoadingRows({ columns, rows = 4 }: { columns: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, row) => (
        <TableRow key={row}>
          {Array.from({ length: columns }, (_, column) => (
            <TableCell key={column}>
              <Skeleton className="h-4 w-full max-w-[160px]" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

/** Single centered row for an empty table. */
export function TableEmptyRow({ columns, message }: { columns: number; message: string }) {
  return (
    <TableRow>
      <TableCell colSpan={columns} className="h-24 text-center text-sm text-muted-foreground">
        {message}
      </TableCell>
    </TableRow>
  );
}

/** Inline error banner for a failed query. */
export function ErrorNotice({ error, title = "Couldn't load data" }: { error: Error; title?: string }) {
  return (
    <Alert variant="destructive">
      <AlertCircle className="size-4" />
      <AlertDescription>
        <span className="font-medium">{title}.</span> {error.message}
      </AlertDescription>
    </Alert>
  );
}
