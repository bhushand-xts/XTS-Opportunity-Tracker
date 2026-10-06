import { Dialog, DialogContent, DialogHeader, DialogTitle, type RfpQuestionItem } from "@xts/design-system";

export function ViewSourceDialog({
  question,
  onClose,
}: {
  question: RfpQuestionItem | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={question !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Source</DialogTitle>
        </DialogHeader>
        {question && (
          <div className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Source:</span> <span className="font-medium">{question.source}</span>
            </p>
            {question.source === "Generic Master" && (
              <p>
                <span className="text-muted-foreground">Master question id:</span> {question.sourceQuestionId}
              </p>
            )}
            {question.source === "AI Extracted" && (
              <>
                <p>
                  <span className="text-muted-foreground">Document:</span> {question.sourceDocument ?? "—"}
                </p>
                {question.sourcePage !== undefined && (
                  <p>
                    <span className="text-muted-foreground">Page:</span> {question.sourcePage}
                  </p>
                )}
                {question.aiConfidence !== undefined && (
                  <p>
                    <span className="text-muted-foreground">AI confidence:</span> {question.aiConfidence}%
                  </p>
                )}
              </>
            )}
            {question.source === "Manual" && <p className="text-muted-foreground">Manually added — no source document.</p>}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
