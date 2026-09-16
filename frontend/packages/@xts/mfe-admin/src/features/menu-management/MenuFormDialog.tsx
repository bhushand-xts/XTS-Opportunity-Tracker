import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { Menu, MenuInput } from "@xts/api-contracts";
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
import { MENU_TYPE_LABEL, menuFormSchema, type MenuFormValues } from "./menu.schema";
import { ICON_OPTIONS } from "./menu.utils";
import { useMenuMutations } from "./useMenuMutations";

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

  const form = useForm<MenuFormValues>({
    resolver: zodResolver(menuFormSchema),
    defaultValues: {
      menuName: "",
      menuType: "MAIN_MENU",
      parentMenuId: undefined,
      icon: undefined,
      displayOrder: 1,
      isActive: true,
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset(
      menu
        ? {
            menuName: menu.menuName,
            menuType: menu.menuType,
            parentMenuId: menu.parentMenuId ?? undefined,
            icon: menu.icon ?? undefined,
            displayOrder: menu.displayOrder,
            isActive: menu.isActive,
          }
        : {
            menuName: "",
            menuType: "MAIN_MENU",
            parentMenuId: undefined,
            icon: undefined,
            displayOrder: 1,
            isActive: true,
          }
    );
  }, [open, menu, form]);

  const menuType = form.watch("menuType");
  const parentOptions = allMenus.filter((m) => m.menuType === "MAIN_MENU" && m.id !== menu?.id);

  async function onSubmit(values: MenuFormValues) {
    const duplicate = allMenus.some(
      (m) => m.id !== menu?.id && m.menuName.trim().toLowerCase() === values.menuName.trim().toLowerCase()
    );
    if (duplicate) {
      form.setError("menuName", { message: `A menu named "${values.menuName}" already exists.` });
      return;
    }

    if (isEdit && menu.menuType === "MAIN_MENU" && !values.isActive) {
      const hasActiveChild = allMenus.some((m) => m.parentMenuId === menu.id && m.isActive);
      if (hasActiveChild) {
        form.setError("isActive", {
          message: "This Main Menu cannot be set Inactive while it has an active Submenu.",
        });
        return;
      }
    }

    const input: MenuInput = {
      menuName: values.menuName.trim(),
      menuType: values.menuType,
      parentMenuId: values.menuType === "SUB_MENU" ? values.parentMenuId ?? null : null,
      icon: values.icon ?? null,
      displayOrder: values.displayOrder,
      isActive: values.isActive,
    };

    const ok = isEdit ? await updateMenu(menu.id, input) : await createMenu(input);
    if (ok) onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Menu" : "Add Menu"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update this menu entry's details." : "Create a new application menu entry."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="menuName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Menu Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Menu Management" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="menuType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Menu Type</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value);
                        if (value !== "SUB_MENU") form.setValue("parentMenuId", undefined);
                      }}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="MAIN_MENU">{MENU_TYPE_LABEL.MAIN_MENU}</SelectItem>
                        <SelectItem value="SUB_MENU">{MENU_TYPE_LABEL.SUB_MENU}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="displayOrder"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Order</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="parentMenuId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Parent Menu</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange} disabled={menuType !== "SUB_MENU"}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select the main menu" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {parentOptions.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.menuName}
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
              name="icon"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Icon</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
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
