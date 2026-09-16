import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { Role, RoleInput } from "@xts/api-contracts";
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
import { roleFormSchema, type RoleFormValues } from "./role.schema";
import { useRoleMutations } from "./useRoleMutations";

export function RoleFormDialog({
  open,
  onOpenChange,
  role,
  allRoles,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: Role | null;
  allRoles: Role[];
}) {
  const isEdit = role !== null;
  const { createRole, updateRole, saving } = useRoleMutations();

  const form = useForm<RoleFormValues>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: { roleName: "", isActive: true },
  });

  useEffect(() => {
    if (!open) return;
    form.reset(role ? { roleName: role.roleName, isActive: role.isActive } : { roleName: "", isActive: true });
  }, [open, role, form]);

  async function onSubmit(values: RoleFormValues) {
    const duplicate = allRoles.some(
      (r) => r.id !== role?.id && r.roleName.trim().toLowerCase() === values.roleName.trim().toLowerCase()
    );
    if (duplicate) {
      form.setError("roleName", { message: `A role named "${values.roleName}" already exists.` });
      return;
    }

    const input: RoleInput = {
      roleName: values.roleName.trim(),
      isActive: values.isActive,
    };

    const ok = isEdit ? await updateRole(role.id, input) : await createRole(input);
    if (ok) onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Role" : "Add Role"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update this role's details." : "Create a new functional user role."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="roleName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Sales Manager" {...field} />
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
