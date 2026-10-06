import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { ListChecks, Upload, Wand2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  PROPOSAL_SUBMISSION_FORMATS,
  REQUIRED_PROPOSAL_SECTIONS,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useSetPageTitle,
  useStore,
  type Opportunity,
  type ProposalSubmissionFormat,
  type SubmissionMethod,
  type UploadedDocument,
  type VendorDemoOption,
} from "@xts/design-system";
import { PageHeader } from "../../components/PageHeader";
import { useAddProposalSectionsBulk, useProposalSections } from "../proposal-outline/proposalSection.mockHooks";
import { ContextAndUploadCard } from "./ContextAndUploadCard";
import { DocumentUpload } from "./DocumentUpload";
import { genericIntakeSchema, type GenericIntakeValues } from "./intake.schema";
import { OpportunityCreateStepper } from "./OpportunityCreateStepper";
import { RfpContextCard } from "./RfpContextCard";
import { SectionTitle } from "./SectionTitle";
import { SolicitationDetailsCard } from "./SolicitationDetailsCard";
import { useViewMode } from "./useViewMode";
import { ViewModeToggle } from "./ViewModeToggle";

// The mockup checks the first 7 of the 8 sections by default.
const DEFAULT_CHECKED_SECTIONS = REQUIRED_PROPOSAL_SECTIONS.slice(0, 7);

const EMPTY: GenericIntakeValues = {
  solicitationNumber: "",
  issuingAgency: "",
  procurementContact: "",
  issueDate: "",
  version: "",
  questionsDue: "",
  proposalDueDate: "",
  submissionDeadline: "",
  additionalDeadline: "",
  additionalDeadlineLabel: "",
  submissionMethod: "Online portal",
  portalUrl: "",
  submissionEmail: "",
  submissionAddress: "",
  instructions: "",
  vendorDemonstrationRequired: "",
  submissionRequirements: "",
  opportunityOverview: "",
  scopeOfWork: "",
  keyRequirements: "",
  notes: "",
  submissionFormat: "Technical + Cost volumes",
  pageLimit: "",
  evaluationBasis: "",
  requiredSections: [...DEFAULT_CHECKED_SECTIONS],
};

const inDays = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

// Dev/testing convenience — fills every required field with valid sample
// data so the intake form can be clicked through in seconds. Not gated
// behind a flag: this whole app is pre-production mock data.
const SAMPLE: GenericIntakeValues = {
  solicitationNumber: "RFP-2026-SAMPLE-002",
  issuingAgency: "Sample Issuing Agency",
  procurementContact: "Pat Reyes / pat.reyes@example.gov",
  issueDate: inDays(0),
  version: "1.0",
  questionsDue: inDays(10),
  proposalDueDate: inDays(25),
  submissionDeadline: inDays(30),
  additionalDeadline: "",
  additionalDeadlineLabel: "",
  submissionMethod: "Online portal",
  portalUrl: "https://portal.example.gov/rfp-2026-002",
  submissionEmail: "",
  submissionAddress: "",
  instructions: "Submit through the vendor portal by 5 PM local time.",
  vendorDemonstrationRequired: "No",
  submissionRequirements: "",
  opportunityOverview: "Sample overview text for quick testing.",
  scopeOfWork: "",
  keyRequirements: "",
  notes: "",
  submissionFormat: "Technical + Cost volumes",
  pageLimit: "40 pages (technical)",
  evaluationBasis: "Technical 60% · Cost 40%",
  requiredSections: [...DEFAULT_CHECKED_SECTIONS],
};

export function GenericIntakePage({ opportunity }: { opportunity: Opportunity }) {
  useSetPageTitle("New opportunity");
  const navigate = useNavigate();
  const { updateOpportunity } = useStore();
  const { sections } = useProposalSections(opportunity.id);
  const [addProposalSectionsBulk] = useAddProposalSectionsBulk();
  const [uploadedDoc, setUploadedDoc] = useState<UploadedDocument | null>(opportunity.document ?? null);
  const [viewMode, setViewMode] = useViewMode();

  const form = useForm<GenericIntakeValues>({ resolver: zodResolver(genericIntakeSchema), defaultValues: EMPTY });

  function onSubmit(values: GenericIntakeValues) {
    updateOpportunity(opportunity.id, {
      solicitation: {
        solicitationNumber: values.solicitationNumber,
        issuingAgency: values.issuingAgency,
        procurementContact: values.procurementContact || "",
        issueDate: values.issueDate,
        version: values.version || undefined,
        questionsDue: values.questionsDue,
        proposalDueDate: values.proposalDueDate,
        submissionDeadline: values.submissionDeadline,
        additionalDeadline: values.additionalDeadline || undefined,
        additionalDeadlineLabel: values.additionalDeadlineLabel || undefined,
        submissionMethod: values.submissionMethod as SubmissionMethod,
        portalUrl: values.portalUrl || undefined,
        submissionEmail: values.submissionEmail || undefined,
        submissionAddress: values.submissionAddress || undefined,
        instructions: values.instructions || undefined,
        vendorDemonstrationRequired: values.vendorDemonstrationRequired as VendorDemoOption,
        submissionRequirements: values.submissionRequirements || undefined,
        opportunityOverview: values.opportunityOverview || undefined,
        scopeOfWork: values.scopeOfWork || undefined,
        keyRequirements: values.keyRequirements || undefined,
        notes: values.notes || undefined,
      },
      document: uploadedDoc ?? undefined,
      proposalRequirements: {
        submissionFormat: values.submissionFormat as ProposalSubmissionFormat,
        pageLimit: values.pageLimit || "",
        evaluationBasis: values.evaluationBasis || "",
        requiredSections: values.requiredSections,
      },
    });

    // Re-seeding on every submit would duplicate sections whenever this step
    // is revisited (e.g. via the back button) and re-submitted — only seed
    // once per opportunity. Sections can still be added/edited/removed
    // directly on the Proposal Outline page after that.
    const alreadySeeded = sections.some((s) => !s.withdrawn);
    if (!alreadySeeded) {
      const now = new Date().toISOString();
      void addProposalSectionsBulk(
        values.requiredSections.map((title, index) => ({
          opportunityId: opportunity.id,
          number: index + 1,
          title,
          volume: /pricing|commercial/i.test(title) ? "Cost volume" : "Technical volume",
          status: "Not Started" as const,
          withdrawn: false,
          createdAt: now,
          updatedAt: now,
        }))
      );
    }

    navigate(`/opportunities/${opportunity.id}/proposal-outline`);
  }

  return (
    <div className="p-5">
      <div className={viewMode === "horizontal" ? "space-y-3" : "mx-auto max-w-[1040px] space-y-6"}>
        <PageHeader
          description={`${opportunity.name} · deadline ${opportunity.expectedClose}`}
          actions={
            <>
              <ViewModeToggle viewMode={viewMode} onChange={setViewMode} />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  form.reset(SAMPLE);
                  setUploadedDoc({
                    id: crypto.randomUUID(),
                    fileName: "sample-rfp-document.pdf",
                    fileSizeLabel: "1.2 MB",
                    uploadedAt: new Date().toISOString(),
                    status: "Ready",
                  });
                }}
              >
                <Wand2 className="mr-2 size-3.5" />
                Fill sample data
              </Button>
            </>
          }
        />
        <OpportunityCreateStepper current={1} />

        <Form {...form}>
          <form className={viewMode === "horizontal" ? "space-y-3" : "space-y-6"} onSubmit={form.handleSubmit(onSubmit)}>
            {viewMode === "horizontal" ? (
              <div className="grid gap-2 lg:grid-cols-2 [&_input]:h-8 [&_input]:text-xs [&_button[role=combobox]]:h-8 [&_button[role=combobox]]:text-xs [&_label]:text-xs">
                <SolicitationDetailsCard variant="generic" compact />
                <ContextAndUploadCard document={uploadedDoc} onChange={setUploadedDoc} />
              </div>
            ) : (
              <>
                <SolicitationDetailsCard variant="generic" />

                <RfpContextCard />

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      <SectionTitle icon={Upload}>Upload document</SectionTitle>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <DocumentUpload document={uploadedDoc} onChange={setUploadedDoc} />
                  </CardContent>
                </Card>
              </>
            )}

            <Card>
              <CardHeader className={viewMode === "horizontal" ? "p-3 pb-1.5" : undefined}>
                <CardTitle className={viewMode === "horizontal" ? "text-sm" : "text-base"}>
                  <SectionTitle icon={ListChecks}>Proposal requirements</SectionTitle>
                </CardTitle>
              </CardHeader>
              <CardContent
                className={
                  viewMode === "horizontal"
                    ? "space-y-3 p-3 pt-0 [&_input]:h-8 [&_input]:text-xs [&_button[role=combobox]]:h-8 [&_button[role=combobox]]:text-xs [&_label]:text-xs"
                    : "space-y-5"
                }
              >
                <div className="grid gap-4 sm:grid-cols-3">
                  <FormField
                    control={form.control}
                    name="submissionFormat"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Submission format</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {PROPOSAL_SUBMISSION_FORMATS.map((f) => (
                              <SelectItem key={f} value={f}>
                                {f}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="pageLimit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Page limit</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. 40 pages (technical)" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="evaluationBasis"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Evaluation basis</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Technical 60% · Cost 40%" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="requiredSections"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Required proposal sections <span className="font-normal text-muted-foreground">— these become the outline</span>
                      </FormLabel>
                      <div className="grid gap-2.5 sm:grid-cols-2">
                        {REQUIRED_PROPOSAL_SECTIONS.map((section) => {
                          const checked = field.value.includes(section);
                          return (
                            <label key={section} className="flex items-center gap-2.5 text-[12.5px]">
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(next) => {
                                  field.onChange(
                                    next ? [...field.value, section] : field.value.filter((s: string) => s !== section)
                                  );
                                }}
                              />
                              {section}
                            </label>
                          );
                        })}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => navigate("/opportunities/new")}>
                Back
              </Button>
              <Button type="submit">Continue to proposal outline</Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
