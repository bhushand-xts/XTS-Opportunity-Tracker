import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { Permission } from "@xts/api-contracts";
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
  Textarea,
} from "@xts/design-system";
import { slugify } from "../menu-management/menu.utils";
import { permissionFormSchema, type PermissionFormValues } from "./permission.schema";
import { usePermissionMutations } from "./usePermissionMutations";

const EMPTY: PermissionFormValues = { permissionName: "", permissionKey: "", description: "" };

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

  const form = useForm<PermissionFormValues>({ resolver: zodResolver(permissionFormSchema), defaultValues: EMPTY });

  useEffect(() => {
    if (!open) return;
    form.reset(
      permission
        ? {
            permissionName: permission.permissionName,
            permissionKey: permission.permissionKey,
            description: permission.description ?? "",
          }
        : EMPTY
    );
  }, [open, permission, form]);

  // While adding, suggest the key from the name until the key is edited by hand.
  const permissionName = form.watch("permissionName");
  useEffect(() => {
    if (isEdit || form.formState.dirtyFields.permissionKey) return;
    form.setValue("permissionKey", slugify(permissionName, "_"), { shouldDirty: false });
  }, [isEdit, permissionName, form]);

  async function onSubmit(values: PermissionFormValues) {
    const key = values.permissionKey.trim();
    const clash = allPermissions.some(
      (p) => p.permissionId !== permission?.permissionId && p.permissionKey.toLowerCase() === key.toLowerCase()
    );
    if (clash) {
      form.setError("permissionKey", { message: `The key "${key}" is already used by another permission.` });
      return;
    }

    const details = {
      permissionName: values.permissionName.trim(),
      permissionKey: key,
      description: values.description?.trim() || null,
    };

    const ok = permission ? await updatePermission(permission.permissionId, details) : await createPermission(details);
    if (ok) onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit permission" : "Add permission"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update this permission's details." : "Create a new permission that can be granted on menus."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="permissionName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Permission name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. View" autoFocus {...field} />
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
                  <FormLabel>Permission key</FormLabel>
                  <FormControl>
                    <Input className="font-mono text-sm" placeholder="e.g. view" {...field} />
                  </FormControl>
                  <FormDescription>Unique identifier used by the application. No spaces.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea rows={3} placeholder="What does this permission allow?" {...field} />
                  </FormControl>
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
