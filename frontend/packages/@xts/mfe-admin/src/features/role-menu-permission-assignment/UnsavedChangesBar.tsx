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
      className="fixed inset-x-4 bottom-4 z-30 mx-auto flex max-w-2xl flex-wrap items-center gap-3 rounded-xl border bg-card px-4 py-3 shadow-lg shadow-primary/10 md:left-[calc(var(--sidebar-width,0px)+1rem)] md:group-has-[[data-collapsible=icon]]/sidebar-wrapper:left-[calc(var(--sidebar-width-icon,0px)+1rem)]"
    >
      <span className="size-2 shrink-0 rounded-full bg-amber-500" aria-hidden="true" />
      <p className="min-w-0 flex-1 text-sm">
        <span className="font-semibold">
          {changes} unsaved {changes === 1 ? "change" : "changes"}
        </span>
        <span className="text-muted-foreground">
          {" "}
          on {menus} {menus === 1 ? "menu" : "menus"}
        </span>
      </p>
      <div className="ml-auto flex shrink-0 items-center gap-2">
        <Button variant="outline" size="sm" disabled={saving} onClick={onReset}>
          Reset
        </Button>
        <Button size="sm" disabled={saving} onClick={onSave}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}
