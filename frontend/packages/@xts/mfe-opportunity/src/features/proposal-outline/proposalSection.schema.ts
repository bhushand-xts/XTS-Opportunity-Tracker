import { z } from "zod";

export const proposalSectionFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(200, "Title must be at most 200 characters")
    .refine((v) => /[a-zA-Z]/.test(v), "Title must include letters, not just numbers"),
  volume: z.string().trim().min(1, "Volume is required").max(100, "Volume must be at most 100 characters"),
  assigneeId: z.string().optional(),
  content: z.string().trim().max(20000).optional().or(z.literal("")),
});

export type ProposalSectionFormValues = z.infer<typeof proposalSectionFormSchema>;
