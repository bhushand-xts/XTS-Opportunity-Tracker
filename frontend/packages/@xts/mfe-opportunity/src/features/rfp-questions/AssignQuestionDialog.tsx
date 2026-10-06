import { useState } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@xts/design-system";
import type { AssignmentInput } from "./rfpQuestionItem.mockHooks";
import { realUserName, useRealUsers } from "./useRealUsers";

const UNSET = "none";

// Assigns one question (ids.length === 1) or several at once (bulk action bar) —
// same dialog either way, the caller decides which ids to pass.
export function AssignQuestionDialog({
  open,
  onOpenChange,
  count,
  submissionDeadline,
  onAssign,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  count: number;
  submissionDeadline?: string;
  onAssign: (assignment: AssignmentInput) => void;
}) {
  const { users, loading, error } = useRealUsers();
  const [assigneeId, setAssigneeId] = useState(UNSET);
  const [reviewerId, setReviewerId] = useState(UNSET);
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");

  const dueDateError =
    dueDate && submissionDeadline && dueDate > submissionDeadline
      ? `Due date can't be after the RFP's submission deadline (${submissionDeadline}).`
      : null;

  function reset() {
    setAssigneeId(UNSET);
    setReviewerId(UNSET);
    setDueDate("");
    setNotes("");
  }

  function handleSubmit() {
    if (dueDateError) return;
    onAssign({
      assigneeId: assigneeId === UNSET ? undefined : assigneeId,
      reviewerId: reviewerId === UNSET ? undefined : reviewerId,
      dueDate: dueDate || undefined,
      notes: notes.trim() || undefined,
    });
    reset();
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Assign question{count > 1 ? "s" : ""}</DialogTitle>
          <DialogDescription>
            {count > 1 ? `Assigning ${count} selected questions.` : "Assign this question to a team member."}
          </DialogDescription>
        </DialogHeader>

        {error && <p className="text-sm text-destructive">Unable to load users.</p>}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Owner</Label>
            <Select value={assigneeId} onValueChange={setAssigneeId} disabled={loading}>
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UNSET}>Unassigned</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={String(u.id)}>
                    {realUserName(u)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Reviewer</Label>
            <Select value={reviewerId} onValueChange={setReviewerId} disabled={loading}>
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UNSET}>None</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={String(u.id)}>
                    {realUserName(u)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Due date</Label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            {dueDateError && <p className="text-xs text-destructive">{dueDateError}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Assignment notes</Label>
            <Textarea rows={2} placeholder="Optional" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit}>
            Assign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
