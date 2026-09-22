import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Form,
  FormControl,
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
import { menuFormSchema, NO_PARENT_MENU, type MenuFormValues } from "./menu.schema";
import { useMenuMutations } from "./useMenuMutations";
import type { Menu } from "./useMenus";

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
  const { createMenu, updateMenu, toggleMenuStatus, saving } = useMenuMutations();

  const form = useForm<MenuFormValues>({
    resolver: zodResolver(menuFormSchema),
    defaultValues: {
      menuName: "",
      menuKey: "",
      icon: "",
      parentId: NO_PARENT_MENU,
      sortOrder: 1,
      isActive: true,
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset(
      menu
        ? {
            menuName: menu.menuName,
            menuKey: menu.menuKey,
            icon: menu.icon ?? "",
            parentId: menu.parentId != null ? String(menu.parentId) : NO_PARENT_MENU,
            sortOrder: menu.sortOrder,
            isActive: menu.isActive,
          }
        : { menuName: "", menuKey: "", icon: "", parentId: NO_PARENT_MENU, sortOrder: 1, isActive: true }
    );
  }, [open, menu, form]);

  // Excludes the menu being edited from the Parent Menu options — a menu
  // can't be its own parent. (Deeper cycle checks, e.g. picking a
  // descendant as parent, are left to the backend since children isn't
  // queried here — see menu.queries.ts.)
  const parentOptions = allMenus.filter((m) => m.menuId !== menu?.menuId);

  async function onSubmit(values: MenuFormValues) {
    const parentId = values.parentId && values.parentId !== NO_PARENT_MENU ? Number(values.parentId) : null;
    const icon = values.icon?.trim() ? values.icon.trim() : null;

    if (isEdit) {
      const updated = await updateMenu(menu.menuId, {
        menuName: values.menuName.trim(),
        menuKey: values.menuKey.trim(),
        icon,
        parentId,
        sortOrder: values.sortOrder,
      });
      if (!updated) return;

      // isActive isn't part of UpdateMenuInput — the backend only exposes it
      // through the separate toggleMenuStatus mutation, so apply it here
      // only when the checkbox actually changed the value.
      if (values.isActive !== menu.isActive) {
        const toggled = await toggleMenuStatus(menu.menuId, values.isActive);
        if (!toggled) return;
      }
      onOpenChange(false);
      return;
    }

    const created = await createMenu({
      menuName: values.menuName.trim(),
      menuKey: values.menuKey.trim(),
      icon,
      parentId,
      sortOrder: values.sortOrder,
    });
    if (created) onOpenChange(false);
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

        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="menuName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Menu Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Dashboard" {...field} />
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
                    <FormLabel>Menu Key</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. dashboard" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="icon"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Icon</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. LayoutDashboard" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sortOrder"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sort Order</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="parentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Parent Menu</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="No parent" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NO_PARENT_MENU}>No parent</SelectItem>
                      {parentOptions.map((option) => (
                        <SelectItem key={option.menuId} value={String(option.menuId)}>
                          {option.menuName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isEdit && (
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center gap-2 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="!mt-0">Active</FormLabel>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                Save
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
