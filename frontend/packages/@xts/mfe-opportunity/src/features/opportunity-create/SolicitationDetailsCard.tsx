import { ChevronDown, ChevronUp, FileText } from "lucide-react";
import { useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  PRE_BID_OPTIONS,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SUBMISSION_METHODS,
  VENDOR_DEMO_OPTIONS,
} from "@xts/design-system";
import { RequiredMark } from "../../components/RequiredMark";
import { SectionTitle } from "./SectionTitle";

// Shared by QuestionnaireIntakePage and GenericIntakePage — both forms use
// these exact field names at their top level, so this reads the ambient form
// context rather than taking a `control` prop.
export function SolicitationDetailsCard({ variant, compact }: { variant: "questionnaire" | "generic"; compact?: boolean }) {
  const { control } = useFormContext();
  const submissionMethod = useWatch({ control, name: "submissionMethod" });
  // Horizontal view only — Solicitation (4 fields) is the shortest of the
  // three cards, so Key dates and Submission cap to the same visible-field
  // count and collapse the rest, keeping all three close to the same height.
  const [expandSolicitation, setExpandSolicitation] = useState(false);
  const [expandKeyDates, setExpandKeyDates] = useState(false);
  const [expandSubmission, setExpandSubmission] = useState(false);

  const solicitationNumberField = (
    <FormField
      control={control}
      name="solicitationNumber"
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            Solicitation / reference no.
            <RequiredMark />
          </FormLabel>
          <FormControl>
            <Input placeholder="RFP-2026-DOT-0417" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
  const issuingAgencyField = (
    <FormField
      control={control}
      name="issuingAgency"
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            Issuing agency / department
            <RequiredMark />
          </FormLabel>
          <FormControl>
            <Input {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
  const procurementContactField = (
    <FormField
      control={control}
      name="procurementContact"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Procurement contact</FormLabel>
          <FormControl>
            <Input placeholder="name / email" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
  const versionField = (
    <FormField
      control={control}
      name="version"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Version</FormLabel>
          <FormControl>
            <Input placeholder="Optional" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
  const issueDateField = (
    <FormField
      control={control}
      name="issueDate"
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            Issue date
            <RequiredMark />
          </FormLabel>
          <FormControl>
            <Input type="date" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
  const questionsDueField = (
    <FormField
      control={control}
      name="questionsDue"
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            Questions due
            <RequiredMark />
          </FormLabel>
          <FormControl>
            <Input type="date" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
  const proposalDueDateField = (
    <FormField
      control={control}
      name="proposalDueDate"
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            Proposal due date
            <RequiredMark />
          </FormLabel>
          <FormControl>
            <Input type="date" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
  const submissionDeadlineField = (
    <FormField
      control={control}
      name="submissionDeadline"
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            Submission deadline
            <RequiredMark />
          </FormLabel>
          <FormControl>
            <Input type="date" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
  const additionalDeadlineField = (
    <FormField
      control={control}
      name="additionalDeadline"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Additional deadline</FormLabel>
          <FormControl>
            <Input type="date" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
  const additionalDeadlineLabelField = (
    <FormField
      control={control}
      name="additionalDeadlineLabel"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Additional deadline label</FormLabel>
          <FormControl>
            <Input placeholder="Required if set above" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
  const submissionMethodField = (
    <FormField
      control={control}
      name="submissionMethod"
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            Submission method
            <RequiredMark />
          </FormLabel>
          <Select value={field.value} onValueChange={field.onChange}>
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder="Select a method" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {SUBMISSION_METHODS.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
  const portalUrlField = (
    <FormField
      control={control}
      name="portalUrl"
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            Portal URL
            <RequiredMark />
          </FormLabel>
          <FormControl>
            <Input type="url" placeholder="https://..." {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
  const submissionEmailField = (
    <FormField
      control={control}
      name="submissionEmail"
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            Submission email
            <RequiredMark />
          </FormLabel>
          <FormControl>
            <Input type="email" placeholder="submissions@agency.gov" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
  const submissionAddressField = (
    <FormField
      control={control}
      name="submissionAddress"
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            Submission address
            <RequiredMark />
          </FormLabel>
          <FormControl>
            <Input placeholder="Mailing address" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
  const vendorDemonstrationRequiredField = (
    <FormField
      control={control}
      name="vendorDemonstrationRequired"
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            Vendor demonstration required
            <RequiredMark />
          </FormLabel>
          <Select value={field.value} onValueChange={field.onChange}>
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {VENDOR_DEMO_OPTIONS.map((o) => (
                <SelectItem key={o} value={o}>
                  {o}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
  const contractTermField = (
    <FormField
      control={control}
      name="contractTerm"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Contract term</FormLabel>
          <FormControl>
            <Input placeholder="e.g. 3 years + 2 optional" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
  const incumbentVendorField = (
    <FormField
      control={control}
      name="incumbentVendor"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Incumbent vendor</FormLabel>
          <FormControl>
            <Input placeholder="if known" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
  const preBidMeetingField = (
    <FormField
      control={control}
      name="preBidMeeting"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Pre-bid meeting</FormLabel>
          <Select value={field.value} onValueChange={field.onChange}>
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {PRE_BID_OPTIONS.map((o) => (
                <SelectItem key={o} value={o}>
                  {o}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  const submissionMethodField2 =
    submissionMethod === "Online portal"
      ? portalUrlField
      : submissionMethod === "Email"
        ? submissionEmailField
        : submissionMethod === "Physical / mail"
          ? submissionAddressField
          : null;

  if (!compact) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            <SectionTitle icon={FileText}>Solicitation details</SectionTitle>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          {solicitationNumberField}
          {issuingAgencyField}
          {procurementContactField}
          {issueDateField}
          {versionField}
          {questionsDueField}
          {proposalDueDateField}
          {submissionDeadlineField}
          {additionalDeadlineField}
          {additionalDeadlineLabelField}
          {submissionMethodField}
          {submissionMethodField2}
          {vendorDemonstrationRequiredField}
          {variant === "questionnaire" && (
            <>
              {contractTermField}
              {incumbentVendorField}
              {preBidMeetingField}
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  const cardHeaderClass = "p-3 pb-1.5";
  const cardContentClass = "space-y-1.5 p-3 pt-0";
  const titleClass = "text-sm";

  return (
    <>
      <Card>
        <CardHeader className={cardHeaderClass}>
          <CardTitle className={titleClass}>Solicitation</CardTitle>
        </CardHeader>
        <CardContent className={cardContentClass}>
          {solicitationNumberField}
          {issuingAgencyField}
          {procurementContactField}
          <Collapsible open={expandSolicitation} onOpenChange={setExpandSolicitation}>
            <CollapsibleContent className="space-y-1.5">{versionField}</CollapsibleContent>
            <CollapsibleTrigger asChild>
              <Button type="button" variant="ghost" size="sm" className="h-6 w-full justify-center text-[11px] text-muted-foreground">
                {expandSolicitation ? (
                  <>
                    <ChevronUp className="mr-1 size-3" />
                    Show less
                  </>
                ) : (
                  <>
                    <ChevronDown className="mr-1 size-3" />
                    Show 1 more field
                  </>
                )}
              </Button>
            </CollapsibleTrigger>
          </Collapsible>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className={cardHeaderClass}>
          <CardTitle className={titleClass}>Key dates</CardTitle>
        </CardHeader>
        <CardContent className={cardContentClass}>
          {issueDateField}
          {questionsDueField}
          {proposalDueDateField}
          <Collapsible open={expandKeyDates} onOpenChange={setExpandKeyDates}>
            <CollapsibleContent className="space-y-1.5">
              {submissionDeadlineField}
              {additionalDeadlineField}
              {additionalDeadlineLabelField}
            </CollapsibleContent>
            <CollapsibleTrigger asChild>
              <Button type="button" variant="ghost" size="sm" className="h-6 w-full justify-center text-[11px] text-muted-foreground">
                {expandKeyDates ? (
                  <>
                    <ChevronUp className="mr-1 size-3" />
                    Show less
                  </>
                ) : (
                  <>
                    <ChevronDown className="mr-1 size-3" />
                    Show 3 more fields
                  </>
                )}
              </Button>
            </CollapsibleTrigger>
          </Collapsible>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className={cardHeaderClass}>
          <CardTitle className={titleClass}>Submission</CardTitle>
        </CardHeader>
        <CardContent className={cardContentClass}>
          {submissionMethodField}
          {submissionMethodField2}
          {vendorDemonstrationRequiredField}
          {variant === "questionnaire" && (
            <Collapsible open={expandSubmission} onOpenChange={setExpandSubmission}>
              <CollapsibleContent className="space-y-1.5">
                {contractTermField}
                {incumbentVendorField}
                {preBidMeetingField}
              </CollapsibleContent>
              <CollapsibleTrigger asChild>
                <Button type="button" variant="ghost" size="sm" className="h-6 w-full justify-center text-[11px] text-muted-foreground">
                  {expandSubmission ? (
                    <>
                      <ChevronUp className="mr-1 size-3" />
                      Show less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="mr-1 size-3" />
                      Show 3 more fields
                    </>
                  )}
                </Button>
              </CollapsibleTrigger>
            </Collapsible>
          )}
        </CardContent>
      </Card>
    </>
  );
}
