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
  Textarea,
} from "@xts/design-system";
import { permissionFormSchema, type PermissionFormValues } from "./permission.schema";
import { usePermissionMutations } from "./usePermissionMutations";
import type { Permission } from "./usePermissions";

export function PermissionFormDialog({
  open,
  onOpenChange,
  permission,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  permission: Permission | null;
}) {
  const isEdit = permission !== null;
  const { createPermission, updatePermission, togglePermissionStatus, saving } = usePermissionMutations();

  const form = useForm<PermissionFormValues>({
    resolver: zodResolver(permissionFormSchema),
    defaultValues: { permissionName: "", permissionKey: "", description: "", isActive: true },
  });

  useEffect(() => {
    if (!open) return;
    form.reset(
      permission
        ? {
            permissionName: permission.permissionName,
            permissionKey: permission.permissionKey,
            description: permission.description ?? "",
            isActive: permission.isActive,
          }
        : { permissionName: "", permissionKey: "", description: "", isActive: true }
    );
  }, [open, permission, form]);

  async function onSubmit(values: PermissionFormValues) {
    const description = values.description?.trim() ? values.description.trim() : null;

    if (isEdit) {
      const updated = await updatePermission(permission.permissionId, {
        permissionName: values.permissionName.trim(),
        permissionKey: values.permissionKey.trim(),
        description,
      });
      if (!updated) return;

      // isActive isn't part of UpdatePermissionInput — the backend only
      // exposes it through the separate togglePermissionStatus mutation, so
      // apply it here only when the checkbox actually changed the value.
      if (values.isActive !== permission.isActive) {
        const toggled = await togglePermissionStatus(permission.permissionId, values.isActive);
        if (!toggled) return;
      }
      onOpenChange(false);
      return;
    }

    const created = await createPermission({
      permissionName: values.permissionName.trim(),
      permissionKey: values.permissionKey.trim(),
      description,
    });
    if (created) onOpenChange(false);
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
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="permissionName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Permission Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Menu View" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="permissionKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Permission Key</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. menu.view" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Describe what this permission allows" {...field} />
                  </FormControl>
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
