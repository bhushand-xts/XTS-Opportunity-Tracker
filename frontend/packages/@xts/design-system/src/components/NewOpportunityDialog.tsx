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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useStore } from "@/lib/store";
import type { Opportunity } from "@/lib/mock-data";
import { toast } from "sonner";

const SOURCES = ["Inbound", "Outbound", "Referral", "Partner", "Event", "Existing"];

export function NewOpportunityDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { customers, users, addOpportunity, currentUser } = useStore();
  const initialCustomer = customers[0];
  const [form, setForm] = useState({
    name: "",
    customerId: initialCustomer?.id ?? "",
    contactName: initialCustomer?.contactName ?? "",
    ownerId: currentUser.id,
    source: "Inbound",
    type: "New Business" as Opportunity["type"],
    value: "",
    probability: "20",
    expectedClose: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    requirements: "",
  });

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = (draft: boolean) => {
    if (!form.name.trim()) {
      toast.error("Opportunity name is required");
      return;
    }
    const owner = users.find((u) => u.id === form.ownerId);
    addOpportunity({
      name: form.name.trim(),
      customerId: form.customerId,
      contactName: form.contactName,
      ownerId: form.ownerId,
      team: owner?.team ?? "Enterprise West",
      source: form.source,
      type: form.type,
      value: Number(form.value) || 0,
      currency: "USD",
      probability: Number(form.probability) || 0,
      expectedClose: form.expectedClose,
      stage: "Identified",
      requirements: form.requirements,
      tags: draft ? ["Draft"] : [],
    });
    toast.success(draft ? "Saved as draft" : `Created "${form.name.trim()}"`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>New opportunity</DialogTitle>
          <DialogDescription>Opportunities always start in the Identified stage.</DialogDescription>
        </DialogHeader>

        <Accordion type="multiple" defaultValue={["basic", "commercial"]} className="w-full">
          <AccordionItem value="basic">
            <AccordionTrigger className="text-[13px] font-semibold">Basic info</AccordionTrigger>
            <AccordionContent className="grid grid-cols-2 gap-4 pt-1">
              <div className="col-span-2 space-y-1.5">
                <Label className="text-[13px]">Opportunity name</Label>
                <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Fleet Telematics Rollout" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[13px]">Customer / account</Label>
                <Select
                  value={form.customerId}
                  onValueChange={(v) => {
                    const customer = customers.find((item) => item.id === v);
                    if (!customer) return;
                    setForm((current) => ({ ...current, customerId: v, contactName: customer.contactName }));
                  }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[13px]">Primary contact</Label>
                <Input value={form.contactName} onChange={(e) => set("contactName", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[13px]">Owner</Label>
                <Select value={form.ownerId} onValueChange={(v) => set("ownerId", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[13px]">Source</Label>
                <Select value={form.source} onValueChange={(v) => set("source", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SOURCES.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[13px]">Opportunity type</Label>
                <Select value={form.type} onValueChange={(v) => set("type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["New Business", "Renewal", "Upsell"].map((t) => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="commercial">
            <AccordionTrigger className="text-[13px] font-semibold">Commercial</AccordionTrigger>
            <AccordionContent className="grid grid-cols-3 gap-4 pt-1">
              <div className="space-y-1.5">
                <Label className="text-[13px]">Estimated value (USD)</Label>
                <Input type="number" value={form.value} onChange={(e) => set("value", e.target.value)} placeholder="120000" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[13px]">Probability %</Label>
                <Input type="number" value={form.probability} onChange={(e) => set("probability", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[13px]">Expected close</Label>
                <Input type="date" value={form.expectedClose} onChange={(e) => set("expectedClose", e.target.value)} />
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="req">
            <AccordionTrigger className="text-[13px] font-semibold">Requirements</AccordionTrigger>
            <AccordionContent className="pt-1">
              <Textarea
                rows={4}
                value={form.requirements}
                onChange={(e) => set("requirements", e.target.value)}
                placeholder="What is the customer asking for?"
              />
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <DialogFooter>
          <Button variant="outline" onClick={() => submit(true)}>Save as draft</Button>
          <Button onClick={() => submit(false)}>Create opportunity</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
