import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Sparkles, Upload, Wand2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Form,
  useSetPageTitle,
  useStore,
  type Opportunity,
  type PreBidOption,
  type SubmissionMethod,
  type UploadedDocument,
  type VendorDemoOption,
} from "@xts/design-system";
import { PageHeader } from "../../components/PageHeader";
import { useAddRfpQuestionItemsBulk, useRfpQuestionItems } from "../rfp-questions/rfpQuestionItem.mockHooks";
import { ContextAndUploadCard } from "./ContextAndUploadCard";
import { DocumentUpload } from "./DocumentUpload";
import { questionnaireIntakeSchema, type QuestionnaireIntakeValues } from "./intake.schema";
import { OpportunityCreateStepper } from "./OpportunityCreateStepper";
import { RfpContextCard } from "./RfpContextCard";
import { SectionTitle } from "./SectionTitle";
import { SolicitationDetailsCard } from "./SolicitationDetailsCard";
import { useViewMode } from "./useViewMode";
import { ViewModeToggle } from "./ViewModeToggle";

// A stand-in for a real extraction service: seeds a handful of representative
// questions so the UI has something real to review — never auto-approved
// (reviewStatus starts "Under review" regardless of source, see mock-data.ts).
const MOCK_EXTRACTED_QUESTIONS = [
  { text: "Describe your company's experience delivering similar engagements in the last 5 years.", mandatory: true },
  { text: "Provide your proposed implementation methodology and timeline.", mandatory: true },
  { text: "List key personnel and their relevant qualifications.", mandatory: true },
  { text: "Describe your approach to data security and compliance.", mandatory: false },
];

const EMPTY: QuestionnaireIntakeValues = {
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
  contractTerm: "",
  incumbentVendor: "",
  preBidMeeting: "",
};

const inDays = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

// Dev/testing convenience — fills every required field with valid sample
// data so the intake form can be clicked through in seconds. Not gated
// behind a flag: this whole app is pre-production mock data.
const SAMPLE: QuestionnaireIntakeValues = {
  solicitationNumber: "RFP-2026-SAMPLE-001",
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
  portalUrl: "https://portal.example.gov/rfp-2026-001",
  submissionEmail: "",
  submissionAddress: "",
  instructions: "Submit through the vendor portal by 5 PM local time.",
  vendorDemonstrationRequired: "No",
  submissionRequirements: "",
  opportunityOverview: "Sample overview text for quick testing.",
  scopeOfWork: "",
  keyRequirements: "",
  notes: "",
  contractTerm: "3 years + 2 optional",
  incumbentVendor: "",
  preBidMeeting: "Optional",
};

export function QuestionnaireIntakePage({ opportunity }: { opportunity: Opportunity }) {
  useSetPageTitle("New opportunity");
  const navigate = useNavigate();
  const { updateOpportunity } = useStore();
  const { questions } = useRfpQuestionItems(opportunity.id);
  const [addQuestionsBulk] = useAddRfpQuestionItemsBulk();
  const [uploadedDoc, setUploadedDoc] = useState<UploadedDocument | null>(opportunity.document ?? null);
  const [viewMode, setViewMode] = useViewMode();

  const form = useForm<QuestionnaireIntakeValues>({ resolver: zodResolver(questionnaireIntakeSchema), defaultValues: EMPTY });

  function onSubmit(values: QuestionnaireIntakeValues) {
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
        contractTerm: values.contractTerm || undefined,
        incumbentVendor: values.incumbentVendor || undefined,
        preBidMeeting: (values.preBidMeeting || undefined) as PreBidOption | undefined,
      },
      document: uploadedDoc ?? undefined,
    });

    // Re-extracting on every submit would duplicate questions whenever this
    // step is revisited (e.g. via the back button) and re-submitted — only
    // seed the mock extraction once per opportunity.
    const alreadyExtracted = questions.some((q) => !q.withdrawn);
    if (!alreadyExtracted) {
      const now = new Date().toISOString();
      void addQuestionsBulk(
        MOCK_EXTRACTED_QUESTIONS.map((q, index) => ({
          opportunityId: opportunity.id,
          number: index + 1,
          questionText: q.text,
          type: "Long Text" as const,
          category: "Technical",
          mandatory: q.mandatory,
          priority: "Medium" as const,
          source: "AI Extracted" as const,
          sourceDocument: uploadedDoc?.fileName,
          aiConfidence: 82,
          reviewStatus: "Under review" as const,
          assignmentStatus: "Unassigned" as const,
          answerStatus: "Not Started" as const,
          answerVersion: 0,
          withdrawn: false,
          createdAt: now,
          updatedAt: now,
        }))
      );
    }

    navigate(`/opportunities/${opportunity.id}/questions`);
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
                <SolicitationDetailsCard variant="questionnaire" compact />
                <ContextAndUploadCard document={uploadedDoc} onChange={setUploadedDoc} />
              </div>
            ) : (
              <>
                <SolicitationDetailsCard variant="questionnaire" />

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

            <Alert>
              <Sparkles className="size-4" />
              <AlertDescription>
                Extraction reads sections and numbered/embedded questions. You can review, merge or add questions before
                responses begin.
              </AlertDescription>
            </Alert>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => navigate("/opportunities/new")}>
                Back
              </Button>
              <Button type="submit">Extract questions</Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
