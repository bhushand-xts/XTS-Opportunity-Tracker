import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { EstimationPhase, EstimationPhaseInput } from "@xts/api-contracts";
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
  Textarea,
} from "@xts/design-system";
import { estimatePhaseFormSchema, type EstimatePhaseFormValues } from "./estimatePhase.schema";
import { useEstimatePhaseMutations } from "./useEstimatePhaseMutations";

const EMPTY: EstimatePhaseFormValues = {
  phaseName: "",
  phaseCode: "",
  description: "",
  displayOrder: "",
  isActive: true,
};

export function EstimatePhaseFormDialog({
  open,
  onOpenChange,
  phase,
  allPhases,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phase: EstimationPhase | null;
  allPhases: EstimationPhase[];
}) {
  const isEdit = phase !== null;
  const { createEstimatePhase, updateEstimatePhase, saving } = useEstimatePhaseMutations();

  const form = useForm<EstimatePhaseFormValues>({ resolver: zodResolver(estimatePhaseFormSchema), defaultValues: EMPTY });

  useEffect(() => {
    if (!open) return;
    form.reset(
      phase
        ? {
            phaseName: phase.phaseName,
            phaseCode: phase.phaseCode ?? "",
            description: phase.description ?? "",
            displayOrder: phase.displayOrder != null ? String(phase.displayOrder) : "",
            isActive: phase.isActive,
          }
        : EMPTY
    );
  }, [open, phase, form]);

  async function onSubmit(values: EstimatePhaseFormValues) {
    const others = allPhases.filter((p) => p.id !== phase?.id);
    const name = values.phaseName.trim().toLowerCase();
    if (others.some((p) => p.phaseName.trim().toLowerCase() === name)) {
      form.setError("phaseName", { message: `An estimate phase named "${values.phaseName.trim()}" already exists.` });
      return;
    }
    const code = values.phaseCode?.trim() ?? "";
    if (code && others.some((p) => p.phaseCode?.toLowerCase() === code.toLowerCase())) {
      form.setError("phaseCode", { message: `The code "${code}" is already used by another estimate phase.` });
      return;
    }

    const input: EstimationPhaseInput = {
      phaseName: values.phaseName.trim(),
      phaseCode: code || null,
      description: values.description?.trim() || null,
      displayOrder: values.displayOrder?.trim() ? Number(values.displayOrder.trim()) : null,
      isActive: values.isActive,
    };

    const ok = isEdit ? await updateEstimatePhase(phase.id, input) : await createEstimatePhase(input);
    if (ok) onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit estimate phase" : "Add estimate phase"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update this estimation phase's details." : "Create a new phase used during estimation."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="phaseName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phase name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Discovery" autoFocus {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phaseCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phase code</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. DISCOVERY" {...field} />
                    </FormControl>
                    <FormDescription>Optional. No spaces.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="displayOrder"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display order</FormLabel>
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
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea rows={3} placeholder="What happens during this phase?" {...field} />
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
