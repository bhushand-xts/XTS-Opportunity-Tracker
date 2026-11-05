import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { AccountType } from "@xts/api-contracts";
import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
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
import {
  accountTypeFormSchema,
  type AccountTypeFormValues,
} from "./accountType.schema";
import { useAccountTypeMutations } from "./useAccountTypeMutations";

const EMPTY: AccountTypeFormValues = {
  accountName: "",
  description: "",
  isActive: true,
};

export function AccountTypeFormDialog({
  open,
  onOpenChange,
  accountType,
  allAccountTypes,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountType: AccountType | null;
  allAccountTypes: AccountType[];
}) {
  const isEdit = accountType !== null;
  const { createAccountType, updateAccountType, saving } = useAccountTypeMutations();

  const form = useForm<AccountTypeFormValues>({
    resolver: zodResolver(accountTypeFormSchema),
    defaultValues: EMPTY,
  });

  useEffect(() => {
    if (!open) return;

    form.reset(
      accountType
        ? {
            accountName: accountType.accountName,
            description: accountType.description ?? "",
            isActive: accountType.isActive,
          }
        : EMPTY
    );
  }, [open, accountType, form]);

  async function onSubmit(values: AccountTypeFormValues) {
    const others = allAccountTypes.filter((a) => a.accountTypeId !== accountType?.accountTypeId);
    const name = values.accountName.trim().toLowerCase();
    if (others.some((a) => a.accountName.trim().toLowerCase() === name)) {
      form.setError("accountName", { message: "An Account Type with this name already exists." });
      return;
    }

    const details = {
      accountName: values.accountName.trim(),
      description: values.description?.trim() || null,
      isActive: values.isActive,
    };

    const success = isEdit
      ? await updateAccountType(accountType.accountTypeId, details)
      : await createAccountType(details);

    if (success) onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit account type" : "Add account type"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit(onSubmit)}
          >
            <FormField
              control={form.control}
              name="accountName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account type name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Enterprise" autoFocus {...field} />
                  </FormControl>
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
                    <Textarea rows={3} placeholder="What is this account type used for?" {...field} />
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
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
