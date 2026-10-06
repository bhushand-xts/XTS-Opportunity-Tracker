import { z } from "zod";

export const subStageFormSchema = z.object({
  stageId: z.string().trim().min(1, "Stage is required"),
  subStageName: z
    .string()
    .trim()
    .min(1, "Sub Stage Name is required")
    .max(150, "Sub Stage Name must be at most 150 characters"),
  isActive: z.boolean(),
});

export type SubStageFormValues = z.infer<typeof subStageFormSchema>;
