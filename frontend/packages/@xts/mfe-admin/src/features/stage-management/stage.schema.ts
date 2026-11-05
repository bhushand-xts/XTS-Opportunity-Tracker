import { z } from "zod";

export const stageFormSchema = z.object({
  stageName: z.string().trim().min(1, "Stage Name is required").max(100, "Stage Name must be at most 100 characters"),
  gate: z.string().trim().max(50, "Gate must be at most 50 characters").optional(),
  // Kept as strings in the form, converted to numbers on submit.
  winPercentage: z
    .string()
    .trim()
    .min(1, "Win % is required")
    .refine((v) => /^\d+(\.\d{1,2})?$/.test(v), "Win % must be a number")
    .refine((v) => Number(v) >= 0 && Number(v) <= 100, "Win % must be between 0 and 100"),
  displayOrder: z
    .string()
    .trim()
    .min(1, "Sequence is required")
    .refine((v) => /^\d+$/.test(v), "Sequence must be a whole, non-negative number"),
  isActive: z.boolean(),
});

export type StageFormValues = z.infer<typeof stageFormSchema>;
