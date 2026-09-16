import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { Permission, PermissionInput } from "@xts/api-contracts";
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
} from "@xts/design-system";
import { permissionFormSchema, type PermissionFormValues } from "./permission.schema";
import { usePermissionMutations } from "./usePermissionMutations";

export function PermissionFormDialog({
  open,
  onOpenChange,
  permission,
  allPermissions,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  permission: Permission | null;
  allPermissions: Permission[];
}) {
  const isEdit = permission !== null;
  const { createPermission, updatePermission, saving } = usePermissionMutations();

  const form = useForm<PermissionFormValues>({
    resolver: zodResolver(permissionFormSchema),
    defaultValues: { permissionName: "", isActive: true },
  });

  useEffect(() => {
    if (!open) return;
    form.reset(
      permission
        ? { permissionName: permission.permissionName, isActive: permission.isActive }
        : { permissionName: "", isActive: true }
    );
  }, [open, permission, form]);

  async function onSubmit(values: PermissionFormValues) {
    const duplicate = allPermissions.some(
      (p) =>
        p.id !== permission?.id &&
        p.permissionName.trim().toLowerCase() === values.permissionName.trim().toLowerCase()
    );
    if (duplicate) {
      form.setError("permissionName", { message: `A permission named "${values.permissionName}" already exists.` });
      return;
    }

    const input: PermissionInput = {
      permissionName: values.permissionName.trim(),
      isActive: values.isActive,
    };

    const ok = isEdit ? await updatePermission(permission.id, input) : await createPermission(input);
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

        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="permissionName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Permission Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. menu.create" {...field} />
                  </FormControl>
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
