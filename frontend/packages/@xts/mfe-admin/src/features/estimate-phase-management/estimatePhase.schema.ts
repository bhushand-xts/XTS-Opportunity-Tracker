import { z } from "zod";

// Limits match the column sizes of mst_estimation_phases.
export const estimatePhaseFormSchema = z.object({
  phaseName: z.string().trim().min(1, "Phase Name is required").max(100, "Phase Name must be at most 100 characters"),
  phaseCode: z
    .string()
    .trim()
    .max(50, "Phase Code must be at most 50 characters")
    .regex(/^\S*$/, "Phase Code cannot contain spaces")
    .optional(),
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

export type EstimatePhaseFormValues = z.infer<typeof estimatePhaseFormSchema>;
