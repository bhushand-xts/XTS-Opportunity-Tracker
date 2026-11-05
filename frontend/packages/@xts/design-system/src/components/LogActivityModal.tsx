import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { ActivityType } from "@/lib/mock-data";
import { useStore } from "@/lib/store";
import { toast } from "sonner";

const TYPES: ActivityType[] = ["Call", "Meeting", "Email", "Task", "Note", "Follow-up"];

export function LogActivityModal({
  open,
  onOpenChange,
  opportunityId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  opportunityId: string;
}) {
  const { addActivity, currentUser } = useStore();
  const [type, setType] = useState<ActivityType>("Call");
  const [subject, setSubject] = useState("");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const submit = () => {
    if (!subject.trim()) {
      toast.error("Subject is required");
      return;
    }
    addActivity({ opportunityId, type, subject: subject.trim(), notes, date, userId: currentUser.id });
    toast.success(`${type} logged`);
    setSubject("");
    setNotes("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Log activity</DialogTitle>
          <DialogDescription>Added to this opportunity&apos;s timeline immediately.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[13px]">Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as ActivityType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px]">{type === "Follow-up" || type === "Task" ? "Due date" : "Date"}</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[13px]">Subject</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder={`e.g. ${type} with customer`} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[13px]">Notes</Label>
            <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit}>Save activity</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
