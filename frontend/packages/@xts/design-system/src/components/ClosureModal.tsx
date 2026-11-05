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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LOST_REASONS } from "@/lib/mock-data";
import { useStore } from "@/lib/store";
import { toast } from "sonner";

type Outcome = "Won" | "Lost" | "Hold";

export function ClosureModal({
  open,
  onOpenChange,
  opportunityId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  opportunityId: string;
}) {
  const { updateOpportunity, moveStage } = useStore();
  const [outcome, setOutcome] = useState<Outcome>("Won");
  const [f, setF] = useState<Record<string, string>>({});
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));

  const required: Record<Outcome, string[]> = {
    Won: ["finalAmount", "closureDate", "reference", "contract"],
    Lost: ["lostReason", "finalValue", "lostDate", "comments"],
    Hold: ["holdReason", "resumeDate", "nextAction"],
  };

  const submit = () => {
    const missing = required[outcome].filter((k) => !f[k]?.toString().trim());
    if (missing.length) {
      toast.error(`All ${outcome} closure fields are mandatory — ${missing.length} still empty.`);
      return;
    }
    updateOpportunity(opportunityId, { closure: { outcome, ...f } });
    moveStage(opportunityId, "Closed");
    toast.success(`Opportunity closed as ${outcome}`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Close opportunity</DialogTitle>
          <DialogDescription>All fields for the selected outcome are mandatory.</DialogDescription>
        </DialogHeader>

        <Tabs value={outcome} onValueChange={(v) => setOutcome(v as Outcome)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="Won">Won</TabsTrigger>
            <TabsTrigger value="Lost">Lost</TabsTrigger>
            <TabsTrigger value="Hold">Hold</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="grid gap-4">
          {outcome === "Won" && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[13px]">Final amount</Label>
                  <Input type="number" value={f["finalAmount"] ?? ""} onChange={(e) => set("finalAmount", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[13px]">Final closure date</Label>
                  <Input type="date" value={f["closureDate"] ?? ""} onChange={(e) => set("closureDate", e.target.value)} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[13px]">Customer confirmation / reference</Label>
                <Input value={f["reference"] ?? ""} onChange={(e) => set("reference", e.target.value)} placeholder="PO number or signed reference" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[13px]">Contract / order info</Label>
                <Input value={f["contract"] ?? ""} onChange={(e) => set("contract", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[13px]">Handoff notes</Label>
                <Textarea rows={3} value={f["handoff"] ?? ""} onChange={(e) => set("handoff", e.target.value)} />
              </div>
            </>
          )}

          {outcome === "Lost" && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[13px]">Lost reason</Label>
                  <Select value={f["lostReason"] ?? ""} onValueChange={(v) => set("lostReason", v)}>
                    <SelectTrigger><SelectValue placeholder="Select reason" /></SelectTrigger>
                    <SelectContent>
                      {LOST_REASONS.map((r) => (<SelectItem key={r} value={r}>{r}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[13px]">Competitor (if any)</Label>
                  <Input value={f["competitor"] ?? ""} onChange={(e) => set("competitor", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[13px]">Final value</Label>
                  <Input type="number" value={f["finalValue"] ?? ""} onChange={(e) => set("finalValue", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[13px]">Lost date</Label>
                  <Input type="date" value={f["lostDate"] ?? ""} onChange={(e) => set("lostDate", e.target.value)} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[13px]">Comments / lessons learned</Label>
                <Textarea rows={3} value={f["comments"] ?? ""} onChange={(e) => set("comments", e.target.value)} />
              </div>
            </>
          )}

          {outcome === "Hold" && (
            <>
              <div className="space-y-1.5">
                <Label className="text-[13px]">Hold reason</Label>
                <Input value={f["holdReason"] ?? ""} onChange={(e) => set("holdReason", e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[13px]">Expected resume date</Label>
                  <Input type="date" value={f["resumeDate"] ?? ""} onChange={(e) => set("resumeDate", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[13px]">Next action</Label>
                  <Input value={f["nextAction"] ?? ""} onChange={(e) => set("nextAction", e.target.value)} />
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit}>Save closure</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
