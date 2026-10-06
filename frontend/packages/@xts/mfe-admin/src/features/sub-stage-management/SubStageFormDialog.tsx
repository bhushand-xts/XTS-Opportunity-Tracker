import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { Stage, SubStage, SubStageInput } from "@xts/api-contracts";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@xts/design-system";
import { subStageFormSchema, type SubStageFormValues } from "./subStage.schema";
import { useSubStageMutations } from "./useSubStageMutations";

const EMPTY: SubStageFormValues = {
  stageId: "",
  subStageName: "",
  isActive: true,
};

export function SubStageFormDialog({
  open,
  onOpenChange,
  subStage,
  allSubStages,
  stages,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subStage: SubStage | null;
  allSubStages: SubStage[];
  stages: Stage[];
}) {
  const isEdit = subStage !== null;
  const { createSubStage, updateSubStage, saving } = useSubStageMutations();

  const form = useForm<SubStageFormValues>({ resolver: zodResolver(subStageFormSchema), defaultValues: EMPTY });

  // Active stages, plus the sub-stage's current stage even if it's since
  // been deactivated, so editing one doesn't show a blank dropdown.
  const stageOptions = stages.filter((s) => s.isActive || s.id === subStage?.stageId);

  useEffect(() => {
    if (!open) return;
    form.reset(
      subStage
        ? {
            stageId: String(subStage.stageId),
            subStageName: subStage.subStageName,
            isActive: subStage.isActive,
          }
        : EMPTY
    );
  }, [open, subStage, form]);

  async function onSubmit(values: SubStageFormValues) {
    const stageId = Number(values.stageId);
    const others = allSubStages.filter((s) => s.id !== subStage?.id && s.stageId === stageId);
    const name = values.subStageName.trim().toLowerCase();
    if (others.some((s) => s.subStageName.trim().toLowerCase() === name)) {
      form.setError("subStageName", {
        message: `A sub stage named "${values.subStageName.trim()}" already exists under this stage.`,
      });
      return;
    }

    const input: SubStageInput = {
      stageId,
      subStageName: values.subStageName.trim(),
      isActive: values.isActive,
    };

    const ok = isEdit ? await updateSubStage(subStage.id, input) : await createSubStage(input);
    if (ok) onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit sub stage" : "Add sub stage"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update this sub stage's details." : "Create a new sub stage under a stage."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="stageId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Stage</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a stage" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {stageOptions.map((s) => (
                        <SelectItem key={s.id} value={String(s.id)}>
                          {s.stageName}
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
              name="subStageName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sub stage name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Pending Approver Review" autoFocus {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center gap-2 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="!mt-0">Active</FormLabel>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
