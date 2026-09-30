import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { RateMaster } from "@xts/api-contracts";
import {
  Button,
  Dialog,
  DialogContent,
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
  Textarea,
} from "@xts/design-system";
import {
  rateMasterFormSchema,
  type RateMasterFormValues,
} from "./rateMaster.schema";
import { useRateMasterMutations } from "./useRateMasterMutations";
import { useCurrencies } from "../currency-management/useCurrencies";

const EMPTY: RateMasterFormValues = {
  roleName: "",
  roleCode: "",
  currencyId: 0,
  rateType: "Monthly",
  defaultRate: "",
  location: "",
  description: "",
  isActive: true,
};

export function RateMasterFormDialog({
  open,
  onOpenChange,
  rateMaster,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rateMaster: RateMaster | null;
}) {
  const isEdit = rateMaster !== null;

  const { createRateMaster, updateRateMaster, saving } =
    useRateMasterMutations();

  const { currencies } = useCurrencies();

  const form = useForm<RateMasterFormValues>({
    resolver: zodResolver(rateMasterFormSchema),
    defaultValues: EMPTY,
  });

  useEffect(() => {
    if (!open) return;

    form.reset(
      rateMaster
        ? {
            roleName: rateMaster.roleName,
            roleCode: rateMaster.roleCode,
            currencyId: rateMaster.currencyId,
            rateType: rateMaster.rateType,
            defaultRate: String(rateMaster.defaultRate),
            location: rateMaster.location ?? "",
            description: rateMaster.description ?? "",
            isActive: rateMaster.isActive,
          }
        : EMPTY
    );
  }, [open, rateMaster, form]);

  async function onSubmit(values: RateMasterFormValues) {
    const details = {
      roleName: values.roleName.trim(),
      roleCode: values.roleCode.trim(),
      currencyId: values.currencyId,
      rateType: values.rateType.trim(),
      defaultRate: Number(values.defaultRate),
      location: values.location?.trim() || null,
      description: values.description?.trim() || null,
    };

    const success = isEdit
      ? await updateRateMaster(rateMaster.ratemasterId, details)
      : await createRateMaster(details);

    if (success) onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit rate master" : "Add rate master"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit(onSubmit)}
          >
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="roleName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Technical Role</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. Developer"
                        autoFocus
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="roleCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Technical Role Code</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. DEV" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="currencyId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency</FormLabel>

                    <Select
                      value={field.value ? String(field.value) : ""}
                      onValueChange={(value) =>
                        field.onChange(Number(value))
                      }
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                      </FormControl>

                      <SelectContent>
                        {currencies
                          .filter((currency) => currency.isActive)
                          .map((currency) => (
                            <SelectItem
                              key={currency.currencyId}
                              value={String(currency.currencyId)}
                            >
                              {currency.currencyName} (
                              {currency.currencyCode})
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
                name="rateType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rate Type</FormLabel>

                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select rate type" />
                        </SelectTrigger>
                      </FormControl>

                      <SelectContent>
                        <SelectItem value="Hourly" disabled>Hourly</SelectItem>
                        <SelectItem value="Daily" disabled>Daily</SelectItem>
                        <SelectItem value="Weekly" disabled>Weekly</SelectItem>
                        <SelectItem value="Monthly">Monthly</SelectItem>
                        <SelectItem value="Yearly" disabled>Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="defaultRate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Standard Rate</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0.01"
                      step="0.01"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. India" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>

              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}