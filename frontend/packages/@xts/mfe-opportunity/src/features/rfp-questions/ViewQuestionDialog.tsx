import { Badge, Dialog, DialogContent, DialogHeader, DialogTitle, type RfpQuestionItem } from "@xts/design-system";

// Read-only — for glancing at the full text and the metadata that the table
// no longer shows as dedicated columns (Type, Category, Source, Priority,
// Reviewer), so trimming those columns doesn't lose access to the data.
export function ViewQuestionDialog({
  question,
  reviewerName,
  onClose,
}: {
  question: RfpQuestionItem | null;
  reviewerName?: string;
  onClose: () => void;
}) {
  return (
    <Dialog open={question !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Question {question ? `#${question.number}` : ""}</DialogTitle>
        </DialogHeader>
        {question && (
          <div className="space-y-4 text-sm">
            <p className="whitespace-pre-wrap font-medium leading-relaxed">
              {question.questionText}
              {question.mandatory && <span className="ml-0.5 text-destructive">*</span>}
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="muted">{question.type}</Badge>
              <Badge variant="muted">{question.category}</Badge>
              <Badge variant="muted">{question.source}</Badge>
              <Badge variant="muted">{question.priority} priority</Badge>
              {question.mandatory && <Badge variant="success">Mandatory</Badge>}
              <Badge variant={question.reviewStatus === "Reviewed" ? "success" : "muted"}>{question.reviewStatus}</Badge>
            </div>
            {reviewerName && (
              <p>
                <span className="text-muted-foreground">Reviewer:</span> {reviewerName}
              </p>
            )}
            {question.reviewerNotes && (
              <p>
                <span className="text-muted-foreground">Reviewer notes:</span> {question.reviewerNotes}
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
