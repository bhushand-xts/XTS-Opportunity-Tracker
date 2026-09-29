import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { Currency } from "@xts/api-contracts";
import {
  Button,
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
} from "@xts/design-system";
import {
  currencyFormSchema,
  type CurrencyFormValues,
} from "./currency.schema";
import { useCurrencyMutations } from "./useCurrencyMutations";

const EMPTY: CurrencyFormValues = {
  currencyName: "",
  currencyCode: "",
  currencySymbol: "",
  isActive: true,
};

export function CurrencyFormDialog({
  open,
  onOpenChange,
  currency,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currency: Currency | null;
}) {
  const isEdit = currency !== null;
  const { createCurrency, updateCurrency, saving } = useCurrencyMutations();

  const form = useForm<CurrencyFormValues>({
    resolver: zodResolver(currencyFormSchema),
    defaultValues: EMPTY,
  });

  useEffect(() => {
    if (!open) return;

    form.reset(
      currency
        ? {
            currencyName: currency.currencyName,
            currencyCode: currency.currencyCode,
            currencySymbol: currency.currencySymbol,
            isActive: currency.isActive,
          }
        : EMPTY
    );
  }, [open, currency, form]);

  async function onSubmit(values: CurrencyFormValues) {
    const details = {
      currencyName: values.currencyName.trim(),
      currencyCode: values.currencyCode.trim(),
      currencySymbol: values.currencySymbol.trim(),
    };

    const success = isEdit
      ? await updateCurrency(currency.currencyId, details)
      : await createCurrency(details);

    if (success) onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit currency" : "Add currency"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit(onSubmit)}
          >
            <FormField
              control={form.control}
              name="currencyName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Currency name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. US Dollar" autoFocus {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="currencyCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Currency code</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. USD" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="currencySymbol"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Currency symbol</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. $" {...field} />
                  </FormControl>
                  <FormMessage />
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