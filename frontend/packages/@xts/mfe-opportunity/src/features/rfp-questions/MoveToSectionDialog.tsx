import { useState } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@xts/design-system";
import { useRfpSections } from "./rfpSection.mockHooks";

const UNSECTIONED = "none";

export function MoveToSectionDialog({
  open,
  onOpenChange,
  opportunityId,
  count,
  onApply,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  opportunityId: string;
  count: number;
  onApply: (sectionId: string | undefined) => void;
}) {
  const { sections } = useRfpSections(opportunityId);
  const [sectionId, setSectionId] = useState(UNSECTIONED);

  function handleApply() {
    onApply(sectionId === UNSECTIONED ? undefined : sectionId);
    setSectionId(UNSECTIONED);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Move to section</DialogTitle>
          <DialogDescription>Move {count} selected question(s) into a section.</DialogDescription>
        </DialogHeader>
        <Select value={sectionId} onValueChange={setSectionId}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={UNSECTIONED}>Unsectioned</SelectItem>
            {sections.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleApply}>
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
