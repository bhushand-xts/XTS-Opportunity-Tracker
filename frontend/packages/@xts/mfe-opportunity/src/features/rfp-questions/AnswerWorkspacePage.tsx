import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ClipboardCheck, PenLine } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  getCurrentUserId,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  useSetPageTitle,
  type Opportunity,
  type RfpQuestionItem,
  type UploadedDocument,
} from "@xts/design-system";
import { PageHeader } from "../../components/PageHeader";
import { RequiredMark } from "../../components/RequiredMark";
import { DocumentUpload } from "../opportunity-create/DocumentUpload";
import { SectionTitle } from "../opportunity-create/SectionTitle";
import { useReviewAnswer, useSaveAnswerDraft, useSubmitAnswer } from "./rfpAnswer.mockHooks";
import { useAssignQuestion, useRfpQuestionItems } from "./rfpQuestionItem.mockHooks";
import { useRfpSections } from "./rfpSection.mockHooks";
import { findRealUserName, useRealUsers } from "./useRealUsers";

export function AnswerWorkspacePage({ opportunity, question }: { opportunity: Opportunity; question: RfpQuestionItem }) {
  useSetPageTitle("Answer workspace");
  const navigate = useNavigate();
  const { questions } = useRfpQuestionItems(opportunity.id);
  const { sections } = useRfpSections(opportunity.id);
  const { users: realUsers } = useRealUsers();
  const [saveDraft] = useSaveAnswerDraft();
  const [submitAnswer] = useSubmitAnswer();
  const [reviewAnswer] = useReviewAnswer();
  const [assignQuestion] = useAssignQuestion();

  const ordered = useMemo(() => questions.filter((q) => !q.withdrawn).sort((a, b) => a.number - b.number), [questions]);
  const index = ordered.findIndex((q) => q.id === question.id);
  const previous = index > 0 ? ordered[index - 1] : null;
  const next = index >= 0 && index < ordered.length - 1 ? ordered[index + 1] : null;
  const section = sections.find((s) => s.id === question.sectionId);

  const [answerValue, setAnswerValue] = useState(question.answerValue ?? "");
  const [answerValues, setAnswerValues] = useState<string[]>(question.answerValues ?? []);
  const [answerDocument, setAnswerDocument] = useState<UploadedDocument | null>(question.answerDocument ?? null);
  const [supportingEvidence, setSupportingEvidence] = useState<UploadedDocument | null>(question.supportingEvidence ?? null);
  const [answererNotes, setAnswererNotes] = useState(question.answererNotes ?? "");
  const [reviewComment, setReviewComment] = useState("");
  const [reworkReason, setReworkReason] = useState("");
  const [submitBlocked, setSubmitBlocked] = useState(false);

  useEffect(() => {
    setAnswerValue(question.answerValue ?? "");
    setAnswerValues(question.answerValues ?? []);
    setAnswerDocument(question.answerDocument ?? null);
    setSupportingEvidence(question.supportingEvidence ?? null);
    setAnswererNotes(question.answererNotes ?? "");
    setReviewComment("");
    setReworkReason("");
    setSubmitBlocked(false);
    // Deliberately only resets when navigating to a *different* question —
    // not on every field of `question`, which would clobber in-progress
    // local edits whenever the store updates (e.g. right after Save Draft).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question.id]);

  const isApproved = question.answerStatus === "Approved";
  const isReviewable = question.answerStatus !== "Not Started" && question.answerStatus !== "In Progress";

  function currentDraft() {
    return {
      answerValue: answerValue || undefined,
      answerValues: answerValues.length ? answerValues : undefined,
      answerDocument: answerDocument ?? undefined,
      supportingEvidence: supportingEvidence ?? undefined,
      answererNotes: answererNotes || undefined,
    };
  }

  // If nobody owns this question yet, whoever actually answers it becomes
  // the owner — avoids leaving a question "Unassigned" after someone has
  // already done the work. Only applies when unassigned; never overrides an
  // existing, explicit assignment to someone else.
  function maybeAutoAssign() {
    const currentUserId = getCurrentUserId();
    if (question.assignmentStatus === "Unassigned" && currentUserId !== null) {
      void assignQuestion(question.id, { assigneeId: String(currentUserId) });
    }
  }

  function handleSaveDraft() {
    void saveDraft(question.id, currentDraft());
    maybeAutoAssign();
  }

  function handleSaveAndNext() {
    void saveDraft(question.id, currentDraft());
    maybeAutoAssign();
    if (next) navigate(`/opportunities/${opportunity.id}/questions/${next.id}/answer`);
  }

  async function handleSubmit() {
    await saveDraft(question.id, currentDraft());
    maybeAutoAssign();
    const ok = await submitAnswer(question.id);
    setSubmitBlocked(!ok);
  }

  function handleApprove() {
    void reviewAnswer(question.id, "Approved", reviewComment || undefined);
  }

  function handleRequestRework() {
    if (!reworkReason.trim()) return;
    void reviewAnswer(question.id, "Rework Required", reviewComment || undefined, reworkReason.trim());
  }

  function renderAnswerControl() {
    switch (question.type) {
      case "Long Text":
      case "Structured Table":
        return <Textarea rows={5} disabled={isApproved} value={answerValue} onChange={(e) => setAnswerValue(e.target.value)} />;
      case "Numeric":
        return (
          <Input
            type="number"
            disabled={isApproved}
            value={answerValue}
            onChange={(e) => setAnswerValue(e.target.value)}
          />
        );
      case "Currency":
        return (
          <Input
            inputMode="decimal"
            placeholder="e.g. 125,000"
            disabled={isApproved}
            value={answerValue}
            onChange={(e) => setAnswerValue(e.target.value)}
          />
        );
      case "Date":
        return <Input type="date" disabled={isApproved} value={answerValue} onChange={(e) => setAnswerValue(e.target.value)} />;
      case "Yes/No":
        return (
          <Select value={answerValue} onValueChange={setAnswerValue} disabled={isApproved}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Yes">Yes</SelectItem>
              <SelectItem value="No">No</SelectItem>
            </SelectContent>
          </Select>
        );
      case "Single Select":
        return (
          <Select value={answerValue} onValueChange={setAnswerValue} disabled={isApproved}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {(question.answerOptions ?? []).map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case "Multi Select":
        return (
          <div className="flex flex-col gap-2">
            {(question.answerOptions ?? []).map((option) => {
              const checked = answerValues.includes(option);
              return (
                <label key={option} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={checked}
                    disabled={isApproved}
                    onCheckedChange={(next) => {
                      setAnswerValues(next ? [...answerValues, option] : answerValues.filter((o) => o !== option));
                    }}
                  />
                  {option}
                </label>
              );
            })}
            {(question.answerOptions ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">No answer options configured for this question yet.</p>
            )}
          </div>
        );
      case "File Attachment":
        return <DocumentUpload document={answerDocument} onChange={setAnswerDocument} />;
      case "Short Text":
      default:
        return <Input disabled={isApproved} value={answerValue} onChange={(e) => setAnswerValue(e.target.value)} />;
    }
}

  return (
    <div className="space-y-4 p-5">
      <PageHeader
        description={`${opportunity.name} · Question ${index + 1} of ${ordered.length}`}
        actions={
          <>
            <Button variant="outline" size="sm" disabled={!previous} onClick={() => previous && navigate(`/opportunities/${opportunity.id}/questions/${previous.id}/answer`)}>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={!next} onClick={() => next && navigate(`/opportunities/${opportunity.id}/questions/${next.id}/answer`)}>
              Next
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate(`/opportunities/${opportunity.id}/questions`)}>
              Back to review
            </Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                <SectionTitle icon={PenLine}>
                  Question #{question.number}
                  {question.mandatory && <RequiredMark />}
                </SectionTitle>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-[15px] font-medium leading-relaxed">{question.questionText}</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="muted">{question.type}</Badge>
                <Badge variant="muted">{question.category}</Badge>
                <Badge variant="muted">{section ? section.name : "Unsectioned"}</Badge>
                <Badge variant="muted">{question.priority} priority</Badge>
                <Badge variant="muted">Source: {question.source}</Badge>
              </div>
              {question.source === "AI Extracted" && (
                <p className="text-xs text-muted-foreground">
                  {question.sourceDocument ?? "—"}
                  {question.sourcePage !== undefined && ` · page ${question.sourcePage}`}
                  {question.aiConfidence !== undefined && ` · ${question.aiConfidence}% confidence`}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Your answer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {renderAnswerControl()}
              {submitBlocked && (
                <p className="text-sm text-destructive">This question is mandatory — enter an answer before submitting.</p>
              )}
              <div className="space-y-1.5">
                <Label>Supporting evidence</Label>
                <DocumentUpload document={supportingEvidence} onChange={setSupportingEvidence} />
              </div>
              <div className="space-y-1.5">
                <Label>Internal notes</Label>
                <Textarea
                  rows={2}
                  placeholder="Optional — visible to your team, not part of the answer itself"
                  disabled={isApproved}
                  value={answererNotes}
                  onChange={(e) => setAnswererNotes(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {!isApproved && (
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" onClick={handleSaveDraft}>
                Save draft
              </Button>
              <Button variant="outline" disabled={!next} onClick={handleSaveAndNext}>
                Save & next
              </Button>
              <Button onClick={() => void handleSubmit()}>Submit for review</Button>
            </div>
          )}
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                <SectionTitle icon={ClipboardCheck}>Internal review</SectionTitle>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <Badge
                  variant={
                    question.answerStatus === "Approved"
                      ? "success"
                      : question.answerStatus === "Rework Required"
                        ? "destructive"
                        : "muted"
                  }
                >
                  {question.answerStatus}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Version</span>
                <span>{question.answerVersion + 1}</span>
              </div>
              {question.assigneeId && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Owner</span>
                  <span>{findRealUserName(realUsers, question.assigneeId) ?? "—"}</span>
                </div>
              )}
              {question.reworkReason && question.answerStatus === "Rework Required" && (
                <div className="rounded-md border border-destructive/30 bg-destructive/5 p-2.5 text-xs">
                  <span className="font-medium text-destructive">Rework reason:</span> {question.reworkReason}
                </div>
              )}
              {question.answerReviewComment && (
                <p className="text-xs text-muted-foreground">Last comment: {question.answerReviewComment}</p>
              )}

              {isReviewable && !isApproved && (
                <div className="space-y-2 border-t pt-3">
                  <Label>Review comment</Label>
                  <Textarea rows={2} placeholder="Optional" value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} />
                  <Label>
                    Rework reason
                    <span className="ml-1 font-normal text-muted-foreground">— required to request rework</span>
                  </Label>
                  <Textarea rows={2} value={reworkReason} onChange={(e) => setReworkReason(e.target.value)} />
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" className="flex-1" onClick={handleApprove}>
                      Approve
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1" disabled={!reworkReason.trim()} onClick={handleRequestRework}>
                      Request rework
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
