import { zodResolver } from "@hookform/resolvers/zod";
import { Briefcase, Building2, ChevronDown, ChevronUp, Inbox, Plus, Trash2, User, Wand2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { useLocation, useNavigate } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
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
  useSetPageTitle,
  useStore,
  type AccountType,
  type Customer,
  type DecisionRole,
  type Priority,
  type Relationship,
  type Sector,
  type ServiceLine,
} from "@xts/design-system";
import { PageHeader } from "../../components/PageHeader";
import { RequiredMark } from "../../components/RequiredMark";
import { realUserName, useRealUsers } from "../rfp-questions/useRealUsers";
import { useCities, useCountries, useStates } from "./addressLookup.mockHooks";
import { ClientCombobox } from "./ClientCombobox";
import { SelectClientDialog } from "./SelectClientDialog";
import { useViewMode } from "./useViewMode";
import { ViewModeToggle } from "./ViewModeToggle";
import {
  useAccountTypes,
  useCurrencies,
  useDecisionRoles,
  useOpportunitySources,
  usePriorities,
  useRelationshipTypes,
  useSectors,
  useServiceLines,
} from "./masterData.mockHooks";
import { OpportunityCreateStepper } from "./OpportunityCreateStepper";
import { opportunityCreateStep1Schema, type OpportunityCreateStep1Values } from "./opportunityCreate.schema";
import { RfpTypeCards } from "./RfpTypeCard";
import { SectionTitle } from "./SectionTitle";

const EMPTY_CONTACT = { key: "", name: "", title: "", email: "", phone: "", decisionRole: "" };

function emptyValues(): OpportunityCreateStep1Values {
  return {
    title: "",
    value: "",
    currency: "USD",
    serviceLine: "" as never,
    source: "",
    ownerId: "",
    priority: "" as never,
    accountName: "",
    relationship: "" as never,
    accountType: "" as never,
    sector: "" as never,
    website: "",
    city: "",
    state: "",
    country: "United States",
    address: "",
    contacts: [{ ...EMPTY_CONTACT, key: crypto.randomUUID() }],
    rfpType: "Questionnaire",
  };
}

// Dev/testing convenience — fills every field with valid sample data so the
// whole wizard can be clicked through in seconds instead of typed out by
// hand each time. Not gated behind a flag: this whole app is pre-production
// mock data, so there's nothing to protect it from.
function sampleValues(defaultOwnerId: string): OpportunityCreateStep1Values {
  return {
    title: "Sample RFP Opportunity",
    value: "250,000",
    currency: "USD",
    serviceLine: "Data & platform engineering",
    source: "Public procurement portal",
    ownerId: defaultOwnerId,
    priority: "Medium",
    accountName: "Acme Test Agency",
    relationship: "New client",
    accountType: "Government — State",
    sector: "Transportation",
    website: "https://example.com",
    city: "Austin",
    state: "Texas",
    country: "United States",
    address: "100 Main St",
    contacts: [
      {
        key: crypto.randomUUID(),
        name: "Jordan Mills",
        title: "Procurement Officer",
        email: "jordan.mills@example.com",
        phone: "+1 512-555-0100",
        decisionRole: "Procurement / buyer",
      },
    ],
    rfpType: "Questionnaire",
  };
}

export function Step1Details() {
  useSetPageTitle("New opportunity");
  const navigate = useNavigate();
  const location = useLocation();
  const { customers, opportunities, addCustomer, updateCustomer, addOpportunity } = useStore();
  const { users: realUsers } = useRealUsers();
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  // Set once, on mount, if this page was reached from the Pipeline board's
  // "New opportunity" flow with a chosen client (via SelectClientDialog) —
  // locks the account-name field to a read-only summary instead of the
  // editable combobox. Absent for every other entry point (direct nav, the
  // intake pages' Back button, a refresh), which keeps those working
  // exactly as before.
  const [clientLocked, setClientLocked] = useState(false);
  const [changeClientOpen, setChangeClientOpen] = useState(false);
  const appliedPreselectedCustomer = useRef(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [viewMode, setViewMode] = useViewMode();
  // Horizontal view only — Opportunity and Customer each have more fields
  // than Primary contact (the shortest card), so they cap to the same
  // visible-field count and collapse the rest, keeping the three cards close
  // to the same height.
  const [expandOpportunity, setExpandOpportunity] = useState(false);
  const [expandCustomer, setExpandCustomer] = useState(false);

  const { data: currencies } = useCurrencies();
  const { data: serviceLines } = useServiceLines();
  const { data: opportunitySources } = useOpportunitySources();
  const { data: relationshipTypes } = useRelationshipTypes();
  const { data: accountTypes } = useAccountTypes();
  const { data: sectors } = useSectors();
  const { data: decisionRoles } = useDecisionRoles();
  const { data: priorities } = usePriorities();
  const { data: countries } = useCountries();

  const form = useForm<OpportunityCreateStep1Values>({
    resolver: zodResolver(opportunityCreateStep1Schema),
    defaultValues: emptyValues(),
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "contacts" });

  // Real users load async (unlike the old synchronous mock list) — default
  // Owner to the first one once they arrive, but only if nothing's been
  // picked yet, so this never clobbers a manual selection.
  useEffect(() => {
    if (!form.getValues("ownerId") && realUsers.length > 0) {
      form.setValue("ownerId", String(realUsers[0].id));
    }
  }, [realUsers, form]);

  const country = useWatch({ control: form.control, name: "country" });
  const state = useWatch({ control: form.control, name: "state" });
  const { data: states } = useStates(country);
  const { data: cities } = useCities(country, state);

  function handleSelectCustomer(customer: Customer | null) {
    setSelectedCustomerId(customer?.id ?? null);
    if (!customer) return;
    form.setValue("relationship", customer.relationship);
    form.setValue("accountType", customer.accountType);
    form.setValue("sector", customer.sector);
    form.setValue("website", customer.website);
    form.setValue("country", customer.country);
    form.setValue("state", customer.state);
    form.setValue("city", customer.city);
    form.setValue("address", customer.address);
  }

  useEffect(() => {
    if (appliedPreselectedCustomer.current) return;
    const preselectedCustomerId = (location.state as { customerId?: string } | null)?.customerId;
    if (!preselectedCustomerId) return;
    const customer = customers.find((c) => c.id === preselectedCustomerId);
    if (!customer) return;
    appliedPreselectedCustomer.current = true;
    form.setValue("accountName", customer.name);
    handleSelectCustomer(customer);
    setClientLocked(true);
    // handleSelectCustomer is defined above and intentionally omitted — the
    // appliedPreselectedCustomer ref ensures this only ever runs once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state, customers, form]);

  function handleCancel() {
    if (form.formState.isDirty) setCancelConfirmOpen(true);
    else navigate("/opportunities");
  }

  function onSubmit(values: OpportunityCreateStep1Values) {
    const duplicateTitle = opportunities.some((o) => o.name.trim().toLowerCase() === values.title.trim().toLowerCase());
    if (duplicateTitle) {
      form.setError("title", { message: "An opportunity with this title already exists." });
      return;
    }

    const customerFields = {
      relationship: values.relationship as Relationship,
      accountType: values.accountType as AccountType,
      sector: values.sector as Sector,
      website: values.website ?? "",
      city: values.city,
      state: values.state,
      country: values.country,
      address: values.address ?? "",
    };
    // An existing client was selected: reuse its record (saving any edits made
    // here back onto it) instead of creating a duplicate Customer row.
    let customerId: string;
    if (selectedCustomerId) {
      updateCustomer(selectedCustomerId, { name: values.accountName, ...customerFields });
      customerId = selectedCustomerId;
    } else {
      customerId = addCustomer({ name: values.accountName, ...customerFields }).id;
    }

    const created = addOpportunity({
      name: values.title,
      customerId,
      contacts: values.contacts.map((c, index) => ({
        id: crypto.randomUUID(),
        name: c.name,
        title: c.title,
        email: c.email,
        phone: c.phone,
        decisionRole: (c.decisionRole || null) as DecisionRole | null,
        isPrimary: index === 0,
      })),
      ownerId: values.ownerId,
      // Real users (see useRealUsers) have no "team" field yet — unlike the
      // old mock user list, there's nothing to derive this from today.
      team: "",
      source: values.source,
      serviceLine: values.serviceLine as ServiceLine,
      priority: values.priority as Priority,
      value: Number(values.value.replace(/,/g, "")) || 0,
      currency: values.currency,
      probability: 20,
      expectedClose: new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10),
      // "Identified" has no Pipeline board column (see BOARD_COLUMNS) — a new
      // opportunity would otherwise exist in the store but never appear as a
      // card anywhere. "Qualifying" is the first real column.
      stage: "Qualifying",
      requirements: "",
      tags: [],
      rfpType: values.rfpType,
    });

    navigate(`/opportunities/${created.id}/intake`);
  }

  // Same FormFields power both layouts below — only how they're grouped into
  // Cards differs between vertical and horizontal view, so each field is
  // defined once here and placed into whichever Card wrapper applies.
  const titleField = (
    <FormField
      control={form.control}
      name="title"
      render={({ field }) => (
        <FormItem className="sm:col-span-2">
          <FormLabel>
            Opportunity title
            <RequiredMark />
          </FormLabel>
          <FormControl>
            <Input placeholder="e.g. Fleet Telematics Rollout" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  const valueField = (
    <FormField
      control={form.control}
      name="value"
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            Estimated value
            <RequiredMark />
          </FormLabel>
          <FormControl>
            <Input inputMode="decimal" placeholder="1,250,000" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  const currencyField = (
    <FormField
      control={form.control}
      name="currency"
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            Currency
            <RequiredMark />
          </FormLabel>
          <Select value={field.value} onValueChange={field.onChange}>
            <FormControl>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {currencies.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  const serviceLineField = (
    <FormField
      control={form.control}
      name="serviceLine"
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            Service line
            <RequiredMark />
          </FormLabel>
          <Select value={field.value} onValueChange={field.onChange}>
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder="Select a service line" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {serviceLines.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  const sourceField = (
    <FormField
      control={form.control}
      name="source"
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            Source
            <RequiredMark />
          </FormLabel>
          <Select value={field.value} onValueChange={field.onChange}>
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder="Select a source" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {opportunitySources.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  const ownerField = (
    <FormField
      control={form.control}
      name="ownerId"
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            Owner
            <RequiredMark />
          </FormLabel>
          <Select value={field.value} onValueChange={field.onChange}>
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder="Select an owner" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {realUsers.map((u) => (
                <SelectItem key={u.id} value={String(u.id)}>
                  {realUserName(u)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  const priorityField = (
    <FormField
      control={form.control}
      name="priority"
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            Priority
            <RequiredMark />
          </FormLabel>
          <Select value={field.value} onValueChange={field.onChange}>
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {priorities.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  const accountNameField = (
    <FormField
      control={form.control}
      name="accountName"
      render={({ field }) => (
        <FormItem className="sm:col-span-2">
          <FormLabel>
            Organization / account name
            <RequiredMark />
          </FormLabel>
          {clientLocked ? (
            <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2">
              <span className="text-sm font-medium">{field.value}</span>
              <Button
                type="button"
                variant="link"
                className="h-auto p-0 text-xs"
                onClick={() => setChangeClientOpen(true)}
              >
                Change client
              </Button>
            </div>
          ) : (
            <FormControl>
              <ClientCombobox
                value={field.value}
                onChange={field.onChange}
                customers={customers}
                onSelectCustomer={handleSelectCustomer}
                placeholder="e.g. State Department of Transportation"
              />
            </FormControl>
          )}
          <FormMessage />
        </FormItem>
      )}
    />
  );

  const relationshipField = (
    <FormField
      control={form.control}
      name="relationship"
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            Relationship
            <RequiredMark />
          </FormLabel>
          <Select value={field.value} onValueChange={field.onChange}>
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder="Select relationship" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {relationshipTypes.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  const accountTypeField = (
    <FormField
      control={form.control}
      name="accountType"
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            Account type
            <RequiredMark />
          </FormLabel>
          <Select value={field.value} onValueChange={field.onChange}>
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder="Select account type" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {accountTypes.map((a) => (
                <SelectItem key={a} value={a}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  const sectorField = (
    <FormField
      control={form.control}
      name="sector"
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            Sector / industry
            <RequiredMark />
          </FormLabel>
          <Select value={field.value} onValueChange={field.onChange}>
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder="Select sector" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {sectors.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  const websiteField = (
    <FormField
      control={form.control}
      name="website"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Website</FormLabel>
          <FormControl>
            <Input type="url" placeholder="https://... (optional)" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  const countryField = (
    <FormField
      control={form.control}
      name="country"
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            Country
            <RequiredMark />
          </FormLabel>
          <Select
            value={field.value}
            onValueChange={(v) => {
              field.onChange(v);
              form.setValue("state", "");
              form.setValue("city", "");
            }}
          >
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder="Select a country" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {countries.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  const stateField = (
    <FormField
      control={form.control}
      name="state"
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            State / province
            <RequiredMark />
          </FormLabel>
          <Select
            value={field.value}
            onValueChange={(v) => {
              field.onChange(v);
              form.setValue("city", "");
            }}
            disabled={!country}
          >
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder={country ? "Select a state" : "Select a country first"} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {states.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  const cityField = (
    <FormField
      control={form.control}
      name="city"
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            City
            <RequiredMark />
          </FormLabel>
          <Select value={field.value} onValueChange={field.onChange} disabled={!state}>
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder={state ? "Select a city" : "Select a state first"} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {cities.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  const addressField = (
    <FormField
      control={form.control}
      name="address"
      render={({ field }) => (
        <FormItem className="sm:col-span-2">
          <FormLabel>Street address</FormLabel>
          <FormControl>
            <Input placeholder="Optional — address line, postal code" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  // One contact's fields, shared by both views — only the surrounding card
  // (and, in compact mode, a tighter border/padding + stacked single-column
  // fields instead of a 2-column sub-grid) differs.
  function renderContactBlock(index: number, compact: boolean) {
    // The primary contact's compact card already says "Primary contact" in
    // its own badge — rather than giving that badge its own row (costing a
    // full row of height versus the Address card), it rides along on the
    // Full name field's label row instead.
    const isPrimaryCompact = compact && index === 0;
    const nameField = (
      <FormField
        control={form.control}
        name={`contacts.${index}.name`}
        render={({ field: f }) => (
          <FormItem>
            <FormLabel className={isPrimaryCompact ? "flex items-center justify-between" : undefined}>
              <span>
                Full name
                <RequiredMark />
              </span>
              {isPrimaryCompact && (
                <Badge variant="outline" className="font-normal">
                  Primary contact
                </Badge>
              )}
            </FormLabel>
            <FormControl>
              <Input placeholder="e.g. Jordan Mills" {...f} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    );
    const titleFieldC = (
      <FormField
        control={form.control}
        name={`contacts.${index}.title`}
        render={({ field: f }) => (
          <FormItem>
            <FormLabel>
              Title / role
              <RequiredMark />
            </FormLabel>
            <FormControl>
              <Input placeholder="e.g. Procurement Officer" {...f} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    );
    const emailField = (
      <FormField
        control={form.control}
        name={`contacts.${index}.email`}
        render={({ field: f }) => (
          <FormItem>
            <FormLabel>
              Email
              <RequiredMark />
            </FormLabel>
            <FormControl>
              <Input type="email" placeholder="name@example.com" {...f} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    );
    const phoneField = (
      <FormField
        control={form.control}
        name={`contacts.${index}.phone`}
        render={({ field: f }) => (
          <FormItem>
            <FormLabel>
              Phone
              <RequiredMark />
            </FormLabel>
            <FormControl>
              <Input type="tel" placeholder="e.g. +1 512-555-0100" {...f} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    );
    const decisionRoleField = (
      <FormField
        control={form.control}
        name={`contacts.${index}.decisionRole`}
        render={({ field: f }) => (
          <FormItem className={compact ? "" : "sm:col-span-2"}>
            <FormLabel>
              Role in decision
              <RequiredMark />
            </FormLabel>
            <Select value={f.value} onValueChange={f.onChange}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {decisionRoles.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
    );

    return (
      <div key={fields[index].id} className={compact ? "space-y-1.5 rounded-lg border p-2" : "space-y-4 rounded-lg border p-4"}>
        {isPrimaryCompact ? (
          fields.length > 1 && (
            <div className="flex justify-end">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Remove contact ${index + 1}`}
                onClick={() => remove(index)}
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          )
        ) : (
          <div className="flex items-center justify-between">
            {index === 0 ? (
              <Badge variant="outline">Primary contact</Badge>
            ) : (
              <span className="text-sm font-medium text-muted-foreground">Contact {index + 1}</span>
            )}
            {fields.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Remove contact ${index + 1}`}
                onClick={() => remove(index)}
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            )}
          </div>
        )}
        {compact ? (
          <div className="space-y-1.5">
            {nameField}
            {titleFieldC}
            {emailField}
            {phoneField}
            {decisionRoleField}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {nameField}
            {titleFieldC}
            {emailField}
            {phoneField}
            {decisionRoleField}
          </div>
        )}
      </div>
    );
  }

  function renderAddContactButton(compact?: boolean) {
    return (
      <Button
        type="button"
        variant="ghost"
        size={compact ? "sm" : "default"}
        className={compact ? "h-8 w-full text-xs text-primary" : "text-primary"}
        onClick={() => append({ ...EMPTY_CONTACT, key: crypto.randomUUID() })}
      >
        <Plus className={compact ? "mr-1.5 size-3.5" : "mr-2 size-4"} />
        Add another contact
      </Button>
    );
  }

  return (
    <div className="p-5">
      <div className={viewMode === "horizontal" ? "space-y-3" : "mx-auto max-w-[1040px] space-y-6"}>
        <PageHeader
          description="Capture the basics, then choose how this opportunity came in."
          actions={
            <>
              <span className="text-xs text-destructive">* Required Fields</span>
              <ViewModeToggle viewMode={viewMode} onChange={setViewMode} />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedCustomerId(null);
                  form.reset(sampleValues(realUsers[0] ? String(realUsers[0].id) : ""));
                }}
              >
                <Wand2 className="mr-2 size-3.5" />
                Fill sample data
              </Button>
            </>
          }
        />
        <OpportunityCreateStepper current={0} />

        <Form {...form}>
          <form className={viewMode === "horizontal" ? "space-y-3" : "space-y-6"} onSubmit={form.handleSubmit(onSubmit)}>
            {viewMode === "vertical" ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      <SectionTitle icon={Briefcase}>Opportunity</SectionTitle>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4 sm:grid-cols-2">
                    {titleField}
                    {valueField}
                    {currencyField}
                    {serviceLineField}
                    {sourceField}
                    {ownerField}
                    {priorityField}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      <SectionTitle icon={Building2}>Client &amp; account</SectionTitle>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4 sm:grid-cols-2">
                    {accountNameField}
                    {relationshipField}
                    {accountTypeField}
                    {sectorField}
                    {websiteField}
                    {countryField}
                    {stateField}
                    {cityField}
                    {addressField}
                  </CardContent>
                </Card>
              </>
            ) : (
              <div className="grid gap-2 lg:grid-cols-3 [&_input]:h-8 [&_input]:text-xs [&_button[role=combobox]]:h-8 [&_button[role=combobox]]:text-xs [&_label]:text-xs">
                <Card>
                  <CardHeader className="p-3 pb-1.5">
                    <CardTitle className="text-sm">
                      <SectionTitle icon={Building2}>Customer information</SectionTitle>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1.5 p-3 pt-0">
                    {accountNameField}
                    {relationshipField}
                    {accountTypeField}
                    {sectorField}
                    {websiteField}
                    <Collapsible open={expandCustomer} onOpenChange={setExpandCustomer}>
                      <CollapsibleContent className="space-y-1.5">
                        {countryField}
                        {stateField}
                        {cityField}
                        {addressField}
                      </CollapsibleContent>
                      <CollapsibleTrigger asChild>
                        <Button type="button" variant="ghost" size="sm" className="h-6 w-full justify-center text-[11px] text-muted-foreground">
                          {expandCustomer ? (
                            <>
                              <ChevronUp className="mr-1 size-3" />
                              Show less
                            </>
                          ) : (
                            <>
                              <ChevronDown className="mr-1 size-3" />
                              Show 4 more fields
                            </>
                          )}
                        </Button>
                      </CollapsibleTrigger>
                    </Collapsible>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="p-3 pb-1.5">
                    <CardTitle className="text-sm">
                      <SectionTitle icon={Briefcase}>Opportunity information</SectionTitle>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1.5 p-3 pt-0">
                    {titleField}
                    {valueField}
                    {currencyField}
                    {serviceLineField}
                    {sourceField}
                    <Collapsible open={expandOpportunity} onOpenChange={setExpandOpportunity}>
                      <CollapsibleContent className="space-y-1.5">
                        {ownerField}
                        {priorityField}
                      </CollapsibleContent>
                      <CollapsibleTrigger asChild>
                        <Button type="button" variant="ghost" size="sm" className="h-6 w-full justify-center text-[11px] text-muted-foreground">
                          {expandOpportunity ? (
                            <>
                              <ChevronUp className="mr-1 size-3" />
                              Show less
                            </>
                          ) : (
                            <>
                              <ChevronDown className="mr-1 size-3" />
                              Show 2 more fields
                            </>
                          )}
                        </Button>
                      </CollapsibleTrigger>
                    </Collapsible>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="p-3 pb-1.5">
                    <CardTitle className="text-sm">
                      <SectionTitle icon={User}>Primary contact</SectionTitle>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1.5 p-3 pt-0">
                    {fields.map((_, index) => renderContactBlock(index, true))}
                    {renderAddContactButton(true)}
                  </CardContent>
                </Card>
              </div>
            )}

            {viewMode === "vertical" && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    <SectionTitle icon={User}>Primary contact</SectionTitle>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  {fields.map((_, index) => renderContactBlock(index, false))}
                  {renderAddContactButton()}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className={viewMode === "horizontal" ? "p-3 pb-1.5" : undefined}>
                <CardTitle className="text-base">
                  <SectionTitle icon={Inbox}>
                    RFP type <span className="ml-1 font-normal text-muted-foreground">— sets the intake workflow</span>
                  </SectionTitle>
                </CardTitle>
              </CardHeader>
              <CardContent className={viewMode === "horizontal" ? "p-3 pt-0" : undefined}>
                <FormField
                  control={form.control}
                  name="rfpType"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <RfpTypeCards value={field.value} onChange={field.onChange} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button type="submit">
                Continue to {form.watch("rfpType") === "Generic" ? "generic RFP intake" : "RFP intake"}
              </Button>
            </div>
          </form>
        </Form>
      </div>

      <SelectClientDialog
        open={changeClientOpen}
        onOpenChange={setChangeClientOpen}
        onSelectClient={(customer) => {
          form.setValue("accountName", customer.name);
          handleSelectCustomer(customer);
          setClientLocked(true);
          setChangeClientOpen(false);
        }}
        onNewClient={() => {
          form.setValue("accountName", "");
          setSelectedCustomerId(null);
          setClientLocked(false);
          setChangeClientOpen(false);
        }}
      />

      <AlertDialog open={cancelConfirmOpen} onOpenChange={setCancelConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard this opportunity?</AlertDialogTitle>
            <AlertDialogDescription>
              You&apos;ve entered details that haven&apos;t been saved. Leaving now discards everything on this screen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => navigate("/opportunities")}>
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
