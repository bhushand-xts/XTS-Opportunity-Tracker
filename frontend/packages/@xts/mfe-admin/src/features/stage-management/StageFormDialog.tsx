import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { Stage, StageInput } from "@xts/api-contracts";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
} from "@xts/design-system";
import { stageFormSchema, type StageFormValues } from "./stage.schema";
import { useStageMutations } from "./useStageMutations";

const EMPTY: StageFormValues = {
  stageName: "",
  gate: "",
  winPercentage: "",
  displayOrder: "",
  isActive: true,
};

export function StageFormDialog({
  open,
  onOpenChange,
  stage,
  allStages,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stage: Stage | null;
  allStages: Stage[];
}) {
  const isEdit = stage !== null;
  const { createStage, updateStage, saving } = useStageMutations();

  const form = useForm<StageFormValues>({ resolver: zodResolver(stageFormSchema), defaultValues: EMPTY });

  useEffect(() => {
    if (!open) return;
    form.reset(
      stage
        ? {
            stageName: stage.stageName,
            gate: stage.gate ?? "",
            winPercentage: String(stage.winPercentage),
            displayOrder: String(stage.displayOrder),
            isActive: stage.isActive,
          }
        : EMPTY
    );
  }, [open, stage, form]);

  async function onSubmit(values: StageFormValues) {
    const others = allStages.filter((s) => s.id !== stage?.id);
    const name = values.stageName.trim().toLowerCase();
    if (others.some((s) => s.stageName.trim().toLowerCase() === name)) {
      form.setError("stageName", { message: `A stage named "${values.stageName.trim()}" already exists.` });
      return;
    }

    const order = Number(values.displayOrder.trim());
    if (others.some((s) => s.displayOrder === order)) {
      form.setError("displayOrder", { message: `Sequence ${order} is already used by another stage.` });
      return;
    }

    const input: StageInput = {
      stageName: values.stageName.trim(),
      gate: values.gate?.trim() || null,
      winPercentage: Number(values.winPercentage.trim()),
      displayOrder: order,
      isActive: values.isActive,
    };

    const ok = isEdit ? await updateStage(stage.id, input) : await createStage(input);
    if (ok) onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit stage" : "Add stage"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update this stage's details." : "Create a new stage in the opportunity lifecycle."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="stageName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Stage name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Identified" autoFocus {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="winPercentage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Win %</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} max={100} step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="displayOrder"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sequence</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="gate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Gate</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Gate 1" {...field} />
                  </FormControl>
                  <FormDescription>Optional. The approval gate associated with this stage, if any.</FormDescription>
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
