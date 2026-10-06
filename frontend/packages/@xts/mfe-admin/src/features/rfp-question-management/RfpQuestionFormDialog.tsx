import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { RfpQuestion, RfpQuestionInput } from "@xts/api-contracts";
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
  Textarea,
} from "@xts/design-system";
import { rfpQuestionFormSchema, type RfpQuestionFormValues } from "./rfpQuestion.schema";
import { useRfpQuestionCategories } from "./rfpQuestionCategories";
import { useRfpQuestionMutations } from "./useRfpQuestionMutations";

const EMPTY: RfpQuestionFormValues = {
  question: "",
  categoryId: "",
  description: "",
  displayOrder: "",
  isActive: true,
};

export function RfpQuestionFormDialog({
  open,
  onOpenChange,
  question,
  allQuestions,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  question: RfpQuestion | null;
  allQuestions: RfpQuestion[];
}) {
  const isEdit = question !== null;
  const { categories } = useRfpQuestionCategories();
  const { createRfpQuestion, updateRfpQuestion, saving } = useRfpQuestionMutations();

  const form = useForm<RfpQuestionFormValues>({ resolver: zodResolver(rfpQuestionFormSchema), defaultValues: EMPTY });

  useEffect(() => {
    if (!open) return;
    form.reset(
      question
        ? {
            question: question.question,
            categoryId: question.categoryId != null ? String(question.categoryId) : "",
            description: question.description ?? "",
            displayOrder: question.displayOrder != null ? String(question.displayOrder) : "",
            isActive: question.isActive,
          }
        : EMPTY
    );
  }, [open, question, form]);

  async function onSubmit(values: RfpQuestionFormValues) {
    const others = allQuestions.filter((q) => q.id !== question?.id);
    const categoryId = Number(values.categoryId);
    const text = values.question.trim().toLowerCase();

    // Duplicates are scoped to the category: the same question may exist under
    // a different one. Client-side only for now — the server still enforces a
    // global unique index until it carries category_id.
    const sameCategory = others.filter((q) => q.categoryId === categoryId);
    if (sameCategory.some((q) => q.question.trim().toLowerCase() === text)) {
      form.setError("question", { message: "A question with the same text already exists in this category." });
      return;
    }

    const orderText = values.displayOrder?.trim() ?? "";
    const order = orderText ? Number(orderText) : null;
    if (order !== null && others.some((q) => q.displayOrder === order)) {
      form.setError("displayOrder", { message: `Display order ${order} is already used by another RFP question.` });
      return;
    }

    const input: RfpQuestionInput = {
      question: values.question.trim(),
      description: values.description?.trim() || null,
      displayOrder: order,
      isActive: values.isActive,
    };

    const ok = isEdit
      ? await updateRfpQuestion(question.id, input, categoryId)
      : await createRfpQuestion(input, categoryId);
    if (ok) onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit RFP Question" : "Add RFP Question"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update this question's details." : "Create a new standard question used in the RFP process."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="question"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Question</FormLabel>
                  <FormControl>
                    <Textarea rows={3} placeholder="e.g. Describe your implementation methodology." autoFocus {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={String(category.id)}>
                          {category.categoryName}
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
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description / Guidance</FormLabel>
                  <FormControl>
                    <Textarea rows={3} placeholder="Optional guidance for whoever answers this question." {...field} />
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
                    <Input type="number" min={1} {...field} />
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
