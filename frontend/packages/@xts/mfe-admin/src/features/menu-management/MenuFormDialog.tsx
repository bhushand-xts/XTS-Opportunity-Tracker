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
import type { MenuListItem } from "./useMenus";
import { useMenuMutations } from "./useMenuMutations";

export function MenuFormDialog({
  open,
  onOpenChange,
  menu,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  menu: MenuListItem | null;
}) {
  const isEdit = menu !== null;
  const { createMenu, updateMenu } = useMenuMutations();

  // There is nothing meaningful to submit — the backend has no menu
  // mutations, and the real Menu type currently only carries `id`, so there
  // are no fields here to edit. This stays wired to the (no-op) mutation
  // hooks — defense in depth alongside the disabled Save button below — so
  // any attempt to save still surfaces the "not available" toast rather
  // than doing nothing silently.
  async function handleSave() {
    const ok = isEdit ? await updateMenu() : await createMenu();
    if (ok) onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Menu" : "Add Menu"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update this menu entry's details." : "Create a new application menu entry."}
          </DialogDescription>
        </DialogHeader>

        <Alert>
          <AlertDescription>
            This feature isn&apos;t available yet — the backend hasn&apos;t implemented menu create/update. The real Menu
            type currently only exposes an id, so there are no fields to edit here.
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
