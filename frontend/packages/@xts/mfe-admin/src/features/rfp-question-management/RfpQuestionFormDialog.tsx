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
  Textarea,
} from "@xts/design-system";
import { rfpQuestionFormSchema, type RfpQuestionFormValues } from "./rfpQuestion.schema";
import { useRfpQuestionMutations } from "./useRfpQuestionMutations";

const EMPTY: RfpQuestionFormValues = {
  question: "",
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
  const { createRfpQuestion, updateRfpQuestion, saving } = useRfpQuestionMutations();

  const form = useForm<RfpQuestionFormValues>({ resolver: zodResolver(rfpQuestionFormSchema), defaultValues: EMPTY });

  useEffect(() => {
    if (!open) return;
    form.reset(
      question
        ? {
            question: question.question,
            description: question.description ?? "",
            displayOrder: question.displayOrder != null ? String(question.displayOrder) : "",
            isActive: question.isActive,
          }
        : EMPTY
    );
  }, [open, question, form]);

  async function onSubmit(values: RfpQuestionFormValues) {
    const others = allQuestions.filter((q) => q.id !== question?.id);
    const text = values.question.trim().toLowerCase();
    if (others.some((q) => q.question.trim().toLowerCase() === text)) {
      form.setError("question", { message: "This RFP question already exists." });
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

    const ok = isEdit ? await updateRfpQuestion(question.id, input) : await createRfpQuestion(input);
    if (ok) onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit RFP question" : "Add RFP question"}</DialogTitle>
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
                    <Input type="number" min={0} {...field} />
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
