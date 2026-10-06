import { NotebookPen } from "lucide-react";
import { useFormContext, useWatch } from "react-hook-form";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  Textarea,
} from "@xts/design-system";
import { SectionTitle } from "./SectionTitle";

const FIELD_NAMES = [
  "instructions",
  "submissionRequirements",
  "opportunityOverview",
  "scopeOfWork",
  "keyRequirements",
  "notes",
] as const;

function useContextFields() {
  const { control } = useFormContext();

  const instructionsField = (
    <FormField
      control={control}
      name="instructions"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Instructions</FormLabel>
          <FormControl>
            <Textarea placeholder="Optional" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
  const submissionRequirementsField = (
    <FormField
      control={control}
      name="submissionRequirements"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Submission requirements</FormLabel>
          <FormControl>
            <Textarea placeholder="Optional" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
  const opportunityOverviewField = (
    <FormField
      control={control}
      name="opportunityOverview"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Opportunity overview</FormLabel>
          <FormControl>
            <Textarea placeholder="Optional" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
  const scopeOfWorkField = (
    <FormField
      control={control}
      name="scopeOfWork"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Scope of work</FormLabel>
          <FormControl>
            <Textarea placeholder="Optional" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
  const keyRequirementsField = (
    <FormField
      control={control}
      name="keyRequirements"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Key technical / functional requirements</FormLabel>
          <FormControl>
            <Textarea placeholder="Optional" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
  const notesField = (
    <FormField
      control={control}
      name="notes"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Notes</FormLabel>
          <FormControl>
            <Textarea placeholder="Optional" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  return [
    instructionsField,
    submissionRequirementsField,
    opportunityOverviewField,
    scopeOfWorkField,
    keyRequirementsField,
    notesField,
  ];
}

// Free-text context shared by both intake paths — kept in its own card,
// separate from SolicitationDetailsCard's structured grid, since multi-line
// fields don't fit a 3-column layout. Reads the ambient form context the
// same way SolicitationDetailsCard does (both intake forms share field names).
// Vertical view only — horizontal view uses RfpContextDrawerSection instead,
// embedded inside ContextAndUploadCard.
export function RfpContextCard() {
  const fields = useContextFields();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          <SectionTitle icon={NotebookPen}>RFP context & instructions</SectionTitle>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">{fields}</CardContent>
    </Card>
  );
}

// The same six fields, horizontal view's compact form: a one-line summary
// plus a button that opens them in a right-side Sheet at full size — six
// inline textareas would otherwise dwarf every other card on the page. No
// Card wrapper of its own; meant to be embedded inside ContextAndUploadCard
// alongside the Upload document section, so the two share one card.
export function RfpContextDrawerSection() {
  const { control } = useFormContext();
  const fields = useContextFields();
  const values = useWatch({ control, name: FIELD_NAMES });
  const filledCount = values.filter((v) => typeof v === "string" && v.trim().length > 0).length;

  return (
    <div className="space-y-2">
      <CardTitle className="text-sm">
        <SectionTitle icon={NotebookPen}>RFP context & instructions</SectionTitle>
      </CardTitle>
      <p className="text-xs text-muted-foreground">
        {filledCount > 0 ? `${filledCount} of 6 fields added` : "Optional background, scope & submission notes."}
      </p>
      <Sheet>
        <SheetTrigger asChild>
          <Button type="button" variant="outline" size="sm" className="h-7 w-full text-xs">
            <NotebookPen className="mr-1.5 size-3.5" />
            {filledCount > 0 ? "Edit context & instructions" : "Add context & instructions"}
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="text-base">
              <SectionTitle icon={NotebookPen}>RFP context & instructions</SectionTitle>
            </SheetTitle>
            <SheetDescription>Optional background, scope, and submission context for this RFP.</SheetDescription>
          </SheetHeader>
          <div className="flex-1 space-y-4 overflow-y-auto py-4 [&_label]:text-xs">{fields}</div>
          <SheetFooter>
            <SheetClose asChild>
              <Button type="button">Done</Button>
            </SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
