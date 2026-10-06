import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  type RfpSection,
} from "@xts/design-system";
import {
  useAddRfpSection,
  useDeleteRfpSection,
  useRfpSections,
  useUpdateRfpSection,
} from "./rfpSection.mockHooks";
import { realUserName, useRealUsers } from "./useRealUsers";

const UNASSIGNED_OWNER = "none";

export function ManageSectionsDialog({
  open,
  onOpenChange,
  opportunityId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  opportunityId: string;
}) {
  const { sections } = useRfpSections(opportunityId);
  const { users } = useRealUsers();
  const [addSection] = useAddRfpSection();
  const [updateSection] = useUpdateRfpSection();
  const [deleteSection] = useDeleteRfpSection();

  function handleAdd() {
    const now = sections.length;
    void addSection({
      opportunityId,
      name: `Section ${now + 1}`,
      displayOrder: now + 1,
    });
  }

  function move(section: RfpSection, direction: -1 | 1) {
    const ordered = [...sections].sort((a, b) => a.displayOrder - b.displayOrder);
    const index = ordered.findIndex((s) => s.id === section.id);
    const swapWith = ordered[index + direction];
    if (!swapWith) return;
    void updateSection(section.id, { displayOrder: swapWith.displayOrder });
    void updateSection(swapWith.id, { displayOrder: section.displayOrder });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manage sections</DialogTitle>
          <DialogDescription>
            Group questions into sections. Deleting a section moves its questions to &quot;Unsectioned&quot; — it never
            deletes them.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-96 space-y-3 overflow-y-auto">
          {sections.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No sections yet.</p>}
          {sections.map((section, index) => (
            <div key={section.id} className="flex items-start gap-2 rounded-lg border p-3">
              <div className="flex flex-col gap-1 pt-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6"
                  disabled={index === 0}
                  aria-label={`Move ${section.name} up`}
                  onClick={() => move(section, -1)}
                >
                  <ArrowUp className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6"
                  disabled={index === sections.length - 1}
                  aria-label={`Move ${section.name} down`}
                  onClick={() => move(section, 1)}
                >
                  <ArrowDown className="size-3.5" />
                </Button>
              </div>
              <div className="grid flex-1 gap-2 sm:grid-cols-2">
                <Input
                  value={section.name}
                  onChange={(e) => void updateSection(section.id, { name: e.target.value })}
                  placeholder="Section name"
                  className="sm:col-span-2"
                />
                <Input
                  value={section.description ?? ""}
                  onChange={(e) => void updateSection(section.id, { description: e.target.value })}
                  placeholder="Description (optional)"
                  className="sm:col-span-2"
                />
                <Select
                  value={section.ownerId ?? UNASSIGNED_OWNER}
                  onValueChange={(v) => void updateSection(section.id, { ownerId: v === UNASSIGNED_OWNER ? undefined : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Owner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UNASSIGNED_OWNER}>No owner</SelectItem>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={String(u.id)}>
                        {realUserName(u)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="date"
                  value={section.dueDate ?? ""}
                  onChange={(e) => void updateSection(section.id, { dueDate: e.target.value || undefined })}
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Delete ${section.name}`}
                onClick={() => void deleteSection(section.id)}
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>

        <Button type="button" variant="outline" onClick={handleAdd}>
          <Plus className="mr-2 size-4" />
          Add section
        </Button>
      </DialogContent>
    </Dialog>
  );
}
