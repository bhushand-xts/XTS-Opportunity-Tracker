import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Textarea,
  type ProposalSection,
} from "@xts/design-system";
import { RequiredMark } from "../../components/RequiredMark";
import { proposalSectionFormSchema, type ProposalSectionFormValues } from "./proposalSection.schema";

const EMPTY: ProposalSectionFormValues = {
  title: "",
  volume: "Technical volume",
  content: "",
};

export function ProposalSectionDialog({
  open,
  onOpenChange,
  section,
  onCreate,
  onUpdate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  section: ProposalSection | null;
  onCreate: (values: ProposalSectionFormValues) => void;
  onUpdate: (id: string, values: ProposalSectionFormValues) => void;
}) {
  const isEdit = section !== null;
  const form = useForm<ProposalSectionFormValues>({
    resolver: zodResolver(proposalSectionFormSchema),
    defaultValues: EMPTY,
  });

  useEffect(() => {
    if (!open) return;
    form.reset(
      section
        ? { title: section.title, volume: section.volume, content: section.content ?? "" }
        : EMPTY
    );
  }, [open, section, form]);

  function onSubmit(values: ProposalSectionFormValues) {
    if (isEdit) onUpdate(section.id, values);
    else onCreate(values);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Draft section" : "Add section"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Edit this section's title, volume, and drafted content." : "Add a section to the proposal outline."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Title
                      <RequiredMark />
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Technical approach & solution" autoFocus {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="volume"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Volume
                      <RequiredMark />
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Technical volume" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Drafted content</FormLabel>
                  <FormControl>
                    <Textarea rows={8} placeholder="Draft this section…" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
