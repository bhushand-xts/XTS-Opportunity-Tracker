import { z } from "zod";

// Limits match the column sizes of tbl_reason_codes.
export const reasonCodeFormSchema = z.object({
  reasonName: z.string().trim().min(1, "Reason Code Name is required").max(100, "Reason Code Name must be at most 100 characters"),
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

export type ReasonCodeFormValues = z.infer<typeof reasonCodeFormSchema>;
