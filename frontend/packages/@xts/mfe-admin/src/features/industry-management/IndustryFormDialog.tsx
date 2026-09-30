import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { Industry } from "@xts/api-contracts";
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
  Textarea,
} from "@xts/design-system";
import {
  industryFormSchema,
  type IndustryFormValues,
} from "./industry.schema";
import { useIndustryMutations } from "./useIndustryMutations";

const EMPTY: IndustryFormValues = {
  industryName: "",
  description: "",
  isActive: true,
};

export function IndustryFormDialog({
  open,
  onOpenChange,
  industry,
  allIndustries,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  industry: Industry | null;
  allIndustries: Industry[];
}) {
  const isEdit = industry !== null;
  const { createIndustry, updateIndustry, saving } = useIndustryMutations();

  const form = useForm<IndustryFormValues>({
    resolver: zodResolver(industryFormSchema),
    defaultValues: EMPTY,
  });

  useEffect(() => {
    if (!open) return;

    form.reset(
      industry
        ? {
            industryName: industry.industryName,
            description: industry.description ?? "",
            isActive: industry.isActive,
          }
        : EMPTY
    );
  }, [open, industry, form]);

  async function onSubmit(values: IndustryFormValues) {
    const others = allIndustries.filter((i) => i.industryId !== industry?.industryId);
    const name = values.industryName.trim().toLowerCase();
    if (others.some((i) => i.industryName.trim().toLowerCase() === name)) {
      form.setError("industryName", { message: `An industry named "${values.industryName.trim()}" already exists.` });
      return;
    }

    const details = {
      industryName: values.industryName.trim(),
      description: values.description?.trim() || null,
    };

    const success = isEdit
      ? await updateIndustry(industry.industryId, details)
      : await createIndustry(details);

    if (success) onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit industry" : "Add industry"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit(onSubmit)}
          >
            <FormField
              control={form.control}
              name="industryName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Industry name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Healthcare" autoFocus {...field} />
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
                    <Textarea rows={3} placeholder="What is this industry used for?" {...field} />
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
