import {
  Alert,
  AlertDescription,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@xts/design-system";
import type { PermissionListItem } from "./usePermissions";
import { usePermissionMutations } from "./usePermissionMutations";

export function PermissionFormDialog({
  open,
  onOpenChange,
  permission,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  permission: PermissionListItem | null;
}) {
  const isEdit = permission !== null;
  const { createPermission, updatePermission } = usePermissionMutations();

  // There is nothing meaningful to submit — the backend has no permission
  // mutations, and the real Permissions type currently only carries `id`,
  // so there are no fields here to edit. This stays wired to the (no-op)
  // mutation hooks — defense in depth alongside the disabled Save button
  // below — so any attempt to save still surfaces the "not available" toast
  // rather than doing nothing silently.
  async function handleSave() {
    const ok = isEdit ? await updatePermission() : await createPermission();
    if (ok) onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Permission" : "Add Permission"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update this permission's details." : "Create a new permission entry."}
          </DialogDescription>
        </DialogHeader>

        <Alert>
          <AlertDescription>
            This feature isn&apos;t available yet — the backend hasn&apos;t implemented permission create/update. The real
            Permissions type currently only exposes an id, so there are no fields to edit here.
          </AlertDescription>
        </Alert>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button type="button" disabled onClick={handleSave}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
