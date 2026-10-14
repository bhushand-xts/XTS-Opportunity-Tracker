import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
import { Building2, Plus, User } from "lucide-react";
import { City, Country, State } from "country-state-city";
import type { Client, ClientInput } from "@xts/api-contracts";
import { ROLE_IN_DECISION_OPTIONS, ROLE_IN_DECISION_OTHER } from "@xts/api-contracts";
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
import { Combobox } from "./Combobox";
import { SectionIcon } from "./SectionIcon";
import { clientFormSchema, EMPTY_CLIENT_FORM, EMPTY_CONTACT, type ClientFormValues } from "./client.schema";
import { useAccountTypes } from "../account-type-management/useAccountTypes";
import { useIndustries } from "../industry-management/useIndustries";
import { useClientMutations } from "./useClientMutations";

export function ClientFormDialog({
  open,
  onOpenChange,
  client,
  allClients,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client | null;
  allClients: Client[];
}) {
  const isEdit = client !== null;
  const { accountTypes } = useAccountTypes();
  const { industries } = useIndustries();
  const { createClient, updateClient, saving } = useClientMutations();

  const form = useForm<ClientFormValues>({ resolver: zodResolver(clientFormSchema), defaultValues: EMPTY_CLIENT_FORM });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "contacts" });

  // country-state-city only works with iso codes, but mst_client stores
  // plain country/state/city names — so the codes are kept here just to
  // cascade the three typeahead dropdowns, and only the chosen names ever
  // reach the form/backend.
  const [countryIso, setCountryIso] = useState<string | null>(null);
  const [stateIso, setStateIso] = useState<string | null>(null);

  const countryOptions = useMemo(
    () => Country.getAllCountries().map((c) => ({ value: c.isoCode, label: c.name })),
    []
  );
  const stateOptions = useMemo(
    () => (countryIso ? State.getStatesOfCountry(countryIso).map((s) => ({ value: s.isoCode, label: s.name })) : []),
    [countryIso]
  );
  const cityOptions = useMemo(
    () => (countryIso && stateIso ? City.getCitiesOfState(countryIso, stateIso).map((c) => ({ value: c.name, label: c.name })) : []),
    [countryIso, stateIso]
  );

  useEffect(() => {
    if (!open) return;

    // Editing an existing client: resolve its stored country/state names
    // back to iso codes so the cascading dropdowns start pre-populated.
    const countryIsoValue = client ? Country.getAllCountries().find((c) => c.name === client.country)?.isoCode ?? null : null;
    const stateIsoValue =
      client && countryIsoValue
        ? State.getStatesOfCountry(countryIsoValue).find((s) => s.name === client.state)?.isoCode ?? null
        : null;
    setCountryIso(countryIsoValue);
    setStateIso(stateIsoValue);

    form.reset(
      client
        ? {
            clientName: client.clientName,
            accountType: client.accountType ?? "",
            sector: client.sector ?? "",
            website: client.website ?? "",
            city: client.city ?? "",
            state: client.state ?? "",
            country: client.country ?? "",
            streetAddress: client.streetAddress ?? "",
            isActive: client.isActive,
            contacts: client.contacts.length
              ? client.contacts.map((c) => ({
                  fullName: c.fullName,
                  titleRole: c.titleRole ?? "",
                  email: c.email ?? "",
                  phone: c.phone ?? "",
                  roleInDecision: c.roleInDecision != null ? String(c.roleInDecision) : "",
                  roleInDecisionOther: c.roleInDecisionOther ?? "",
                }))
              : [EMPTY_CONTACT],
          }
        : EMPTY_CLIENT_FORM
    );
  }, [open, client, form]);

  async function onSubmit(values: ClientFormValues) {
    const others = allClients.filter((c) => c.id !== client?.id);
    const name = values.clientName.trim().toLowerCase();
    if (others.some((c) => c.clientName.trim().toLowerCase() === name)) {
      form.setError("clientName", { message: `A client named "${values.clientName.trim()}" already exists.` });
      return;
    }

    const contacts = values.contacts
      .filter((c) => c.fullName.trim())
      .map((c) => ({
        fullName: c.fullName.trim(),
        titleRole: c.titleRole?.trim() || null,
        email: c.email?.trim() || null,
        phone: c.phone?.trim() || null,
        roleInDecision: c.roleInDecision ? Number(c.roleInDecision) : null,
        roleInDecisionOther: c.roleInDecision === String(ROLE_IN_DECISION_OTHER) ? c.roleInDecisionOther?.trim() || null : null,
      }));

    const input: ClientInput = {
      clientName: values.clientName.trim(),
      accountType: values.accountType || null,
      sector: values.sector || null,
      website: values.website?.trim() || null,
      city: values.city?.trim() || null,
      state: values.state?.trim() || null,
      country: values.country?.trim() || null,
      streetAddress: values.streetAddress?.trim() || null,
      isActive: values.isActive,
      contacts,
    };

    const ok = isEdit ? await updateClient(client.id, input) : await createClient(input);
    if (ok) onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Plain default centering + a height cap with the whole box scrolling
          as one unit — the simplest pattern that's guaranteed to render at
          any content length (see AddClientDialog's history for what NOT to
          do: sticky header/footer and custom top/bottom anchoring both broke
          in their own way). */}
      <DialogContent className="max-h-[85vh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto p-0">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>{isEdit ? "Edit client" : "Add client"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update the account and its contact people." : "Create the account and its primary contact."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form id="client-form" className="px-6 py-4" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="space-y-4">
              <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <SectionIcon icon={Building2} color="indigo" />
                Client &amp; account
              </p>
              <FormField control={form.control} name="clientName" render={({ field }) => (
                <FormItem><FormLabel>Organization / account name</FormLabel><FormControl><Input autoFocus {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <FormField control={form.control} name="accountType" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account type</FormLabel>
                    <Select value={field.value || undefined} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {accountTypes.filter((a) => a.isActive).map((a) => (
                          <SelectItem key={a.accountTypeId} value={a.accountName}>{a.accountName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="sector" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sector / industry</FormLabel>
                    <Select value={field.value || undefined} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {industries.filter((i) => i.isActive).map((i) => (
                          <SelectItem key={i.industryId} value={i.industryName}>{i.industryName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="website" render={({ field }) => (
                  <FormItem><FormLabel>Website</FormLabel><FormControl><Input placeholder="https://" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              {/* Country first, then State, then City — matches the actual
                  dependency order (each one is disabled until its parent is
                  chosen), rather than the screenshot's visual order. */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <FormField control={form.control} name="country" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country</FormLabel>
                    <Combobox
                      options={countryOptions}
                      value={countryIso}
                      onChange={(iso) => {
                        setCountryIso(iso);
                        setStateIso(null);
                        field.onChange(countryOptions.find((o) => o.value === iso)?.label ?? "");
                        form.setValue("state", "");
                        form.setValue("city", "");
                      }}
                      placeholder="Type to search…"
                      searchPlaceholder="Search countries…"
                    />
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="state" render={({ field }) => (
                  <FormItem>
                    <FormLabel>State / province</FormLabel>
                    <Combobox
                      options={stateOptions}
                      value={stateIso}
                      onChange={(iso) => {
                        setStateIso(iso);
                        field.onChange(stateOptions.find((o) => o.value === iso)?.label ?? "");
                        form.setValue("city", "");
                      }}
                      placeholder={countryIso ? "Type to search…" : "Select a country first"}
                      searchPlaceholder="Search states…"
                      disabled={!countryIso}
                    />
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="city" render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <Combobox
                      options={cityOptions}
                      value={field.value || null}
                      onChange={field.onChange}
                      placeholder={stateIso ? "Type to search…" : "Select a state first"}
                      searchPlaceholder="Search cities…"
                      disabled={!stateIso}
                    />
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="streetAddress" render={({ field }) => (
                <FormItem><FormLabel>Street address</FormLabel><FormControl><Input placeholder="Address line, postal code" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="isActive" render={({ field }) => (
                <FormItem className="flex flex-row items-center gap-2 space-y-0">
                  <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  <FormLabel className="!mt-0">Active</FormLabel>
                </FormItem>
              )} />
            </div>

            <div className="mt-6 space-y-4 border-t pt-4">
              <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <SectionIcon icon={User} color="blue" />
                Primary contact
              </p>
              {fields.map((field, index) => (
                <div key={field.id} className="space-y-3">
                  {index > 0 && (
                    <div className="flex items-center justify-between border-t border-dashed pt-3">
                      <span className="text-xs font-semibold tracking-wide text-primary">ADDITIONAL CONTACT {index + 1}</span>
                      <button type="button" className="text-xs font-medium text-destructive" onClick={() => remove(index)}>
                        Remove
                      </button>
                    </div>
                  )}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField control={form.control} name={`contacts.${index}.fullName`} render={({ field: f }) => (
                      <FormItem><FormLabel>Full name</FormLabel><FormControl><Input placeholder="e.g. Jordan Mills" {...f} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name={`contacts.${index}.titleRole`} render={({ field: f }) => (
                      <FormItem><FormLabel>Title / role</FormLabel><FormControl><Input placeholder="e.g. Procurement Officer" {...f} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <FormField control={form.control} name={`contacts.${index}.email`} render={({ field: f }) => (
                      <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" placeholder="name@domain.com" {...f} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name={`contacts.${index}.phone`} render={({ field: f }) => (
                      <FormItem><FormLabel>Phone</FormLabel><FormControl><Input placeholder="+1 ..." {...f} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name={`contacts.${index}.roleInDecision`} render={({ field: f }) => (
                      <FormItem>
                        <FormLabel>Role in decision</FormLabel>
                        <Select value={f.value || undefined} onValueChange={f.onChange}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                          <SelectContent>
                            {ROLE_IN_DECISION_OPTIONS.map((r) => <SelectItem key={r.value} value={String(r.value)}>{r.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  {form.watch(`contacts.${index}.roleInDecision`) === String(ROLE_IN_DECISION_OTHER) && (
                    <FormField control={form.control} name={`contacts.${index}.roleInDecisionOther`} render={({ field: f }) => (
                      <FormItem><FormLabel>Please specify</FormLabel><FormControl><Input placeholder="Describe their role" {...f} /></FormControl><FormMessage /></FormItem>
                    )} />
                  )}
                </div>
              ))}
              <button
                type="button"
                className="flex items-center gap-1 text-sm text-primary underline"
                onClick={() => append(EMPTY_CONTACT)}
              >
                <Plus className="size-3.5" />
                Add another contact{fields.length > 1 ? ` (${fields.length} contacts so far)` : ""}
              </button>
            </div>
          </form>
        </Form>

        <DialogFooter className="border-t px-6 py-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" form="client-form" disabled={saving}>{saving ? "Saving…" : "Save client"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
