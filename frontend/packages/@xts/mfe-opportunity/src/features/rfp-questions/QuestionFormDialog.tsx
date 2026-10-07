import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import {
  Button,
  Checkbox,
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
  PRIORITIES,
  QUESTION_TYPES,
  RFP_QUESTION_CATEGORIES,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  type RfpQuestionItem,
} from "@xts/design-system";
import { RequiredMark } from "../../components/RequiredMark";
import { formatAnswerOptions, questionFormSchema, type QuestionFormValues } from "./questionForm.schema";
import { useRfpSections } from "./rfpSection.mockHooks";
import { realUserName, useRealUsers } from "./useRealUsers";

const UNSECTIONED = "none";
const UNASSIGNED = "none";
const SELECT_TYPES = ["Single Select", "Multi Select"];

const EMPTY: QuestionFormValues = {
  questionText: "",
  type: "",
  category: "",
  sectionId: UNSECTIONED,
  assigneeId: UNASSIGNED,
  mandatory: false,
  priority: "",
  reviewerNotes: "",
  answerOptionsText: "",
};

// Handles both "Add question" (manual source) and Edit — covers the audit's
// Change Category / Change Section / Change Type / Mark Mandatory / Comment
// actions in one form rather than five separate controls.
export function QuestionFormDialog({
  open,
  onOpenChange,
  opportunityId,
  question,
  onCreate,
  onUpdate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  opportunityId: string;
  question: RfpQuestionItem | null;
  onCreate: (values: QuestionFormValues) => void;
  onUpdate: (id: string, values: QuestionFormValues) => void;
}) {
  const isEdit = question !== null;
  const { sections } = useRfpSections(opportunityId);
  const { users: realUsers } = useRealUsers();
  const form = useForm<QuestionFormValues>({ resolver: zodResolver(questionFormSchema), defaultValues: EMPTY });
  const type = useWatch({ control: form.control, name: "type" });

  useEffect(() => {
    if (!open) return;
    form.reset(
      question
        ? {
            questionText: question.questionText,
            type: question.type,
            category: question.category,
            sectionId: question.sectionId ?? UNSECTIONED,
            assigneeId: UNASSIGNED,
            mandatory: question.mandatory,
            priority: question.priority,
            reviewerNotes: question.reviewerNotes ?? "",
            answerOptionsText: formatAnswerOptions(question.answerOptions),
          }
        : EMPTY
    );
  }, [open, question, form]);

  function onSubmit(values: QuestionFormValues) {
    if (isEdit) onUpdate(question.id, values);
    else onCreate(values);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit question" : "Add question"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update this question's details." : "Add a question written specifically for this RFP."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="questionText"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Question
                    <RequiredMark />
                  </FormLabel>
                  <FormControl>
                    <Textarea rows={3} placeholder="e.g. Describe your implementation methodology." autoFocus {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Type
                      <RequiredMark />
                    </FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {QUESTION_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
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
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Category
                      <RequiredMark />
                    </FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {RFP_QUESTION_CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
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
                name="sectionId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Section</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={UNSECTIONED}>Unsectioned</SelectItem>
                        {sections.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
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
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Priority
                      <RequiredMark />
                    </FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PRIORITIES.map((p) => (
                          <SelectItem key={p} value={p}>
                            {p}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {!isEdit && (
                <FormField
                  control={form.control}
                  name="assigneeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Owner</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                          {realUsers.map((u) => (
                            <SelectItem key={u.id} value={String(u.id)}>
                              {realUserName(u)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {SELECT_TYPES.includes(type) && (
              <FormField
                control={form.control}
                name="answerOptionsText"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Answer options
                      <span className="ml-1 font-normal text-muted-foreground">— comma-separated</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Yes, No, Partially" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="mandatory"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center gap-2 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="!mt-0">Mandatory</FormLabel>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reviewerNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reviewer notes</FormLabel>
                  <FormControl>
                    <Textarea rows={2} placeholder="Optional" {...field} />
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
