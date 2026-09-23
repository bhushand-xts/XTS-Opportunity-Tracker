import { useEffect, useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { Menu } from "@xts/api-contracts";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@xts/design-system";
import { NO_PARENT, menuFormSchema, type MenuFormValues } from "./menu.schema";
import { ICON_OPTIONS, descendantIds, nextSortOrder, slugify } from "./menu.utils";
import { useMenuMutations } from "./useMenuMutations";

const EMPTY: MenuFormValues = { menuName: "", menuKey: "", icon: "", parentId: NO_PARENT, sortOrder: 1 };
const NO_ICON = "none";

export function MenuFormDialog({
  open,
  onOpenChange,
  menu,
  allMenus,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  menu: Menu | null;
  allMenus: Menu[];
}) {
  const isEdit = menu !== null;
  const { createMenu, updateMenu, saving } = useMenuMutations();

  const form = useForm<MenuFormValues>({ resolver: zodResolver(menuFormSchema), defaultValues: EMPTY });

  // A menu can't be its own parent or sit under one of its own submenus, and
  // the backend refuses an inactive parent — so offer only valid choices.
  const parentOptions = useMemo(() => {
    const blocked = menu ? descendantIds(allMenus, menu.menuId) : new Set<number>();
    return allMenus.filter((m) => m.isActive && !blocked.has(m.menuId));
  }, [allMenus, menu]);

  useEffect(() => {
    if (!open) return;
    form.reset(
      menu
        ? {
            menuName: menu.menuName,
            menuKey: menu.menuKey,
            icon: menu.icon ?? "",
            parentId: menu.parentId === null ? NO_PARENT : String(menu.parentId),
            sortOrder: menu.sortOrder,
          }
        : EMPTY
    );
  }, [open, menu, form]);

  // While adding, suggest the key from the name until the key is edited by hand.
  const menuName = form.watch("menuName");
  useEffect(() => {
    if (isEdit || form.formState.dirtyFields.menuKey) return;
    form.setValue("menuKey", slugify(menuName, "_"), { shouldDirty: false });
  }, [isEdit, menuName, form]);

  // While adding, suggest the next free sort order for whichever parent is
  // selected, until the sort order is edited by hand.
  const parentIdValue = form.watch("parentId");
  useEffect(() => {
    if (isEdit || form.formState.dirtyFields.sortOrder) return;
    const parentId = parentIdValue === NO_PARENT ? null : Number(parentIdValue);
    form.setValue("sortOrder", nextSortOrder(allMenus, parentId), { shouldDirty: false });
  }, [isEdit, parentIdValue, allMenus, form]);

  async function onSubmit(values: MenuFormValues) {
    const name = values.menuName.trim();
    const key = values.menuKey.trim();
    const parentId = values.parentId === NO_PARENT ? null : Number(values.parentId);
    // Menus/submenus are only compared for duplicates against their own
    // siblings — the same name or sort order is fine under a different parent.
    const siblings = allMenus.filter((m) => m.menuId !== menu?.menuId && m.parentId === parentId);

    if (siblings.some((m) => m.menuName.trim().toLowerCase() === name.toLowerCase())) {
      form.setError("menuName", {
        message:
          parentId === null
            ? `A menu named "${name}" already exists.`
            : `A submenu named "${name}" already exists under this parent.`,
      });
      return;
    }

    if (allMenus.some((m) => m.menuId !== menu?.menuId && m.menuKey === key)) {
      form.setError("menuKey", { message: `The key "${key}" is already used by another menu.` });
      return;
    }

    if (siblings.some((m) => m.sortOrder === values.sortOrder)) {
      form.setError("sortOrder", {
        message:
          parentId === null
            ? `Sort order ${values.sortOrder} is already used by another top-level menu.`
            : `Sort order ${values.sortOrder} is already used by another submenu under this parent.`,
      });
      return;
    }

    const details = {
      menuName: name,
      menuKey: key,
      icon: values.icon ? values.icon : null,
      sortOrder: values.sortOrder,
      // Only send the parent when it changed: the backend re-validates it on
      // every update, and rejects a parent that has since been deactivated.
      ...(!menu || parentId !== menu.parentId ? { parentId } : {}),
    };

    const ok = menu ? await updateMenu(menu.menuId, details) : await createMenu(details);
    if (ok) onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit menu" : "Add menu"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update this navigation entry." : "Create a new navigation entry."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="menuName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Menu name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. User Management" autoFocus {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="menuKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Menu key</FormLabel>
                  <FormControl>
                    <Input className="font-mono text-sm" placeholder="e.g. user_management" {...field} />
                  </FormControl>
                  <FormDescription>Unique identifier. Lowercase letters, numbers, hyphens and underscores.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="parentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parent menu</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={NO_PARENT}>None (top level)</SelectItem>
                        {parentOptions.map((m) => (
                          <SelectItem key={m.menuId} value={String(m.menuId)}>
                            {m.menuName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sortOrder"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sort order</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="icon"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Icon</FormLabel>
                  <Select
                    value={field.value ? field.value : NO_ICON}
                    onValueChange={(value) => field.onChange(value === NO_ICON ? "" : value)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NO_ICON}>No icon</SelectItem>
                      {ICON_OPTIONS.map((name) => (
                        <SelectItem key={name} value={name}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
