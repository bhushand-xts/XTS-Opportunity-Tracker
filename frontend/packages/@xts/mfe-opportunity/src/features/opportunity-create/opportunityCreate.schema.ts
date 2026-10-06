import { z } from "zod";

const requiredText = (label: string, max = 255) =>
  z.string().trim().min(1, `${label} is required`).max(max, `${label} must be at most ${max} characters`);
const optionalText = (max = 255) => z.string().trim().max(max).optional().or(z.literal(""));
const requiredSelect = (label: string) => z.string().min(1, `${label} is required`);

// A name/title field: text, so it must contain at least one letter — catches
// someone typing a bare number into a field that should read as a name.
const requiredName = (label: string, max = 255) =>
  requiredText(label, max).refine((v) => /[a-zA-Z]/.test(v), `${label} must include letters, not just numbers`);

// A monetary amount: digits only, with optional thousands commas and up to 2
// decimal places. Number(v) alone would also accept "1e10", "0x1F" or
// "Infinity" as valid — this regex is the stricter, correct check. A second
// refine rejects "0" — the regex alone allows it, but the business rule is
// "positive numeric values," not "non-negative."
const requiredAmount = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .refine((v) => /^\d{1,3}(,\d{3})*(\.\d{1,2})?$|^\d+(\.\d{1,2})?$/.test(v), `${label} must be a valid amount (numbers only)`)
    .refine((v) => parseFloat(v.replace(/,/g, "")) > 0, `${label} must be greater than zero`);

const optionalUrl = (max = 255) =>
  optionalText(max).refine((v) => !v || /^https?:\/\/.+/i.test(v), "Enter a valid URL starting with http:// or https://");

const phonePattern = /^\+?[\d\s\-().]{7,20}$/;
const requiredPhone = (label: string, max = 50) =>
  requiredText(label, max).refine((v) => phonePattern.test(v), "Enter a valid phone number");

// Per the user story's acceptance criteria, every contact field is mandatory
// (name, title, email, phone, role in decision) — name/email used to be
// treated as the only minimum, deliberately loosened; that's now tightened
// to match the story exactly.
const contactSchema = z.object({
  key: z.string(),
  name: requiredName("Contact name", 255),
  title: requiredText("Contact title", 150),
  email: z.string().trim().min(1, "Contact email is required").email("Enter a valid email address"),
  phone: requiredPhone("Contact phone", 50),
  decisionRole: requiredSelect("Role in decision"),
});

export const opportunityCreateStep1Schema = z.object({
  title: requiredName("Opportunity title", 255),
  value: requiredAmount("Estimated value"),
  currency: requiredSelect("Currency"),
  serviceLine: requiredSelect("Service line"),
  source: requiredSelect("Source"),
  ownerId: requiredSelect("Owner"),
  priority: requiredSelect("Priority"),

  accountName: requiredName("Organization / account name", 255),
  relationship: requiredSelect("Relationship"),
  accountType: requiredSelect("Account type"),
  sector: requiredSelect("Sector / industry"),
  website: optionalUrl(255),
  city: requiredSelect("City"),
  state: requiredSelect("State / province"),
  country: requiredSelect("Country"),
  address: optionalText(500),

  contacts: z.array(contactSchema).min(1, "At least one contact is required"),

  rfpType: z.enum(["Questionnaire", "Generic"], { errorMap: () => ({ message: "Select an RFP type to continue" }) }),
});

export type OpportunityCreateStep1Values = z.infer<typeof opportunityCreateStep1Schema>;
