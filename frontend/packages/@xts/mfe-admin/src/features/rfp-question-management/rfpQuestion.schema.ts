import { z } from "zod";

// Limits match the column sizes of mst_rfp_questions.
export const rfpQuestionFormSchema = z.object({
  question: z.string().trim().min(1, "Question is required").max(500, "Question must be at most 500 characters"),
  description: z.string().trim().max(500, "Description must be at most 500 characters").optional(),
  // Kept as a string in the form (converted to a number on submit) — blank
  // means "no explicit order" (display_order is nullable).
  displayOrder: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || /^\d+$/.test(v), "Display Order must be a whole, non-negative number"),
  isActive: z.boolean(),
});

export type RfpQuestionFormValues = z.infer<typeof rfpQuestionFormSchema>;
