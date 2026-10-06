import { z } from "zod";

export const questionFormSchema = z.object({
  questionText: z
    .string()
    .trim()
    .min(1, "Question is required")
    .max(2000, "Question must be at most 2000 characters")
    .refine((v) => /[a-zA-Z]/.test(v), "Question must include letters, not just numbers"),
  type: z.string().min(1, "Type is required"),
  category: z.string().min(1, "Category is required"),
  sectionId: z.string().optional().or(z.literal("")),
  mandatory: z.boolean(),
  priority: z.string().min(1, "Priority is required"),
  reviewerNotes: z.string().trim().max(2000).optional().or(z.literal("")),
  // Raw comma-separated entry for Single/Multi Select — see parseAnswerOptions.
  answerOptionsText: z.string().trim().max(2000).optional().or(z.literal("")),
});

export type QuestionFormValues = z.infer<typeof questionFormSchema>;

export function parseAnswerOptions(text: string | undefined): string[] {
  return (text ?? "")
    .split(",")
    .map((option) => option.trim())
    .filter((option) => option.length > 0);
}

export function formatAnswerOptions(options: string[] | undefined): string {
  return (options ?? []).join(", ");
}
