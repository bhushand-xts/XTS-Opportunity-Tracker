import { z } from "zod";

const requiredText = (label: string, max = 255) =>
  z.string().trim().min(1, `${label} is required`).max(max, `${label} must be at most ${max} characters`);
const optionalText = (max = 255) => z.string().trim().max(max).optional().or(z.literal(""));
const requiredSelect = (label: string) => z.string().min(1, `${label} is required`);

// A name/title field: text, so it must contain at least one letter.
const requiredName = (label: string, max = 255) =>
  requiredText(label, max).refine((v) => /[a-zA-Z]/.test(v), `${label} must include letters, not just numbers`);

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const requiredDate = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .refine((v) => DATE_PATTERN.test(v), `${label} must be a valid date`);
const optionalDate = () =>
  z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || DATE_PATTERN.test(v), "Enter a valid date");

const optionalEmail = (max = 255) =>
  optionalText(max).refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Enter a valid email address");
const optionalUrl = (max = 2048) =>
  optionalText(max).refine((v) => !v || /^https?:\/\/.+/i.test(v), "Enter a valid URL starting with http:// or https://");

// Shared by both intake paths — the mockup's Generic screen has exactly these
// 6 solicitation fields; Questionnaire adds 3 more (contract term, incumbent
// vendor, pre-bid meeting), confirmed from the mockup's own markup.
//
// Plus the Stage 1 field-gap closure fields (RFP UI coverage audit): dates,
// version, the submission-method-conditional destination fields, vendor demo
// requirement and free-text context — all shared between both paths.
const solicitationBase = {
  solicitationNumber: requiredText("Solicitation / reference no."),
  issuingAgency: requiredName("Issuing agency / department"),
  procurementContact: optionalText(255),
  issueDate: requiredDate("Issue date"),
  version: optionalText(50),
  questionsDue: requiredDate("Questions due"),
  proposalDueDate: requiredDate("Proposal due date"),
  submissionDeadline: requiredDate("Submission deadline"),
  additionalDeadline: optionalDate(),
  additionalDeadlineLabel: optionalText(255),
  submissionMethod: requiredSelect("Submission method"),
  portalUrl: optionalUrl(2048),
  submissionEmail: optionalEmail(255),
  submissionAddress: optionalText(500),
  instructions: optionalText(2000),
  vendorDemonstrationRequired: requiredSelect("Vendor demonstration required"),
  submissionRequirements: optionalText(2000),
  opportunityOverview: optionalText(2000),
  scopeOfWork: optionalText(2000),
  keyRequirements: optionalText(2000),
  notes: optionalText(2000),
};

// Cross-field rules that a single field's own validator can't express —
// applied to both schemas via .superRefine so the checks aren't duplicated.
function checkSolicitationCrossFields(
  values: {
    additionalDeadline?: string;
    additionalDeadlineLabel?: string;
    submissionMethod?: string;
    portalUrl?: string;
    submissionEmail?: string;
    submissionAddress?: string;
  },
  ctx: z.RefinementCtx
) {
  if (values.additionalDeadline && !values.additionalDeadlineLabel?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["additionalDeadlineLabel"],
      message: "Label is required when an additional deadline is set",
    });
  }
  if (values.submissionMethod === "Online portal" && !values.portalUrl?.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["portalUrl"], message: "Portal URL is required" });
  }
  if (values.submissionMethod === "Email" && !values.submissionEmail?.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["submissionEmail"], message: "Email is required" });
  }
  if (values.submissionMethod === "Physical / mail" && !values.submissionAddress?.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["submissionAddress"], message: "Address is required" });
  }
}

export const questionnaireIntakeSchema = z
  .object({
    ...solicitationBase,
    contractTerm: optionalText(255),
    incumbentVendor: optionalText(255),
    preBidMeeting: z.string().optional().or(z.literal("")),
  })
  .superRefine(checkSolicitationCrossFields);
export type QuestionnaireIntakeValues = z.infer<typeof questionnaireIntakeSchema>;

export const genericIntakeSchema = z
  .object({
    ...solicitationBase,
    submissionFormat: requiredSelect("Submission format"),
    pageLimit: optionalText(50),
    evaluationBasis: optionalText(255),
    requiredSections: z.array(z.string()),
  })
  .superRefine(checkSolicitationCrossFields);
export type GenericIntakeValues = z.infer<typeof genericIntakeSchema>;
