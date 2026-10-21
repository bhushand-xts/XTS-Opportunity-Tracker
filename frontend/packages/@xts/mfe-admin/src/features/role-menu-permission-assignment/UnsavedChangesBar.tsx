import { Button } from "@xts/design-system";

/** Appears at the bottom of the screen while there are unsaved changes, so Save is never out of sight. */
export function UnsavedChangesBar({
  changes,
  menus,
  saving,
  onReset,
  onSave,
}: {
  changes: number;
  menus: number;
  saving: boolean;
  onReset: () => void;
  onSave: () => void;
}) {
  return (
    <div
      role="region"
      aria-label="Unsaved changes"
      className="sticky bottom-5 z-20 mx-auto flex w-full max-w-2xl items-center gap-4 rounded-xl border bg-card px-4 py-3 shadow-lg shadow-primary/10"
    >
      <span className="size-2 shrink-0 rounded-full bg-amber-500" aria-hidden="true" />
      <p className="flex-1 text-sm">
        <span className="font-semibold">
          {changes} unsaved {changes === 1 ? "change" : "changes"}
        </span>
        <span className="text-muted-foreground">
          {" "}
          on {menus} {menus === 1 ? "menu" : "menus"}
        </span>
      </p>
      <Button variant="outline" size="sm" disabled={saving} onClick={onReset}>
        Reset
      </Button>
      <Button size="sm" disabled={saving} onClick={onSave}>
        {saving ? "Saving…" : "Save changes"}
      </Button>
    </div>
  );
}
