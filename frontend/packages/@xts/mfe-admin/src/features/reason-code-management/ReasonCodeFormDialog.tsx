import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { ReasonCode, ReasonCodeInput } from "@xts/api-contracts";
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
import { reasonCodeFormSchema, type ReasonCodeFormValues } from "./reasonCode.schema";
import { useReasonCodeMutations } from "./useReasonCodeMutations";

const EMPTY: ReasonCodeFormValues = {
  reasonName: "",
  description: "",
  displayOrder: "",
  isActive: true,
};

export function ReasonCodeFormDialog({
  open,
  onOpenChange,
  reasonCode,
  allReasonCodes,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reasonCode: ReasonCode | null;
  allReasonCodes: ReasonCode[];
}) {
  const isEdit = reasonCode !== null;
  const { createReasonCode, updateReasonCode, saving } = useReasonCodeMutations();

  const form = useForm<ReasonCodeFormValues>({ resolver: zodResolver(reasonCodeFormSchema), defaultValues: EMPTY });

  useEffect(() => {
    if (!open) return;
    form.reset(
      reasonCode
        ? {
            reasonName: reasonCode.reasonName,
            description: reasonCode.description ?? "",
            displayOrder: reasonCode.displayOrder != null ? String(reasonCode.displayOrder) : "",
            isActive: reasonCode.isActive,
          }
        : EMPTY
    );
  }, [open, reasonCode, form]);

  async function onSubmit(values: ReasonCodeFormValues) {
    const others = allReasonCodes.filter((r) => r.id !== reasonCode?.id);
    const name = values.reasonName.trim().toLowerCase();
    if (others.some((r) => r.reasonName.trim().toLowerCase() === name)) {
      form.setError("reasonName", { message: `A reason code named "${values.reasonName.trim()}" already exists.` });
      return;
    }

    const orderText = values.displayOrder?.trim() ?? "";
    const order = orderText ? Number(orderText) : null;
    if (order !== null && others.some((r) => r.displayOrder === order)) {
      form.setError("displayOrder", { message: `Display order ${order} is already used by another reason code.` });
      return;
    }

    const input: ReasonCodeInput = {
      reasonName: values.reasonName.trim(),
      description: values.description?.trim() || null,
      displayOrder: order,
      isActive: values.isActive,
    };

    const ok = isEdit ? await updateReasonCode(reasonCode.id, input) : await createReasonCode(input);
    if (ok) onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit reason code" : "Add reason code"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update this reason code's details." : "Create a new reason code."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="reasonName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason code name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Budget Constraints" autoFocus {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="displayOrder"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Display order</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} {...field} />
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
                  <FormLabel>Reason description</FormLabel>
                  <FormControl>
                    <Textarea rows={3} placeholder="Describe this reason" {...field} />
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
