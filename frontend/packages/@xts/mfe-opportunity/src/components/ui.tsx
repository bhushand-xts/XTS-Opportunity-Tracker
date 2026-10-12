import { useId, type ReactNode } from 'react';
import { Briefcase, Layers, Users } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle, Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Spinner, Textarea } from '@xts/design-system';
import type { LookupOption, OpportunityState } from '@xts/api-contracts';
import { STATE_LABELS } from '../lib/workflow';

export function Panel({ title, description, tone = 'violet', children, className = '' }: { title: string; description?: string; tone?: 'violet' | 'indigo' | 'teal' | 'neutral'; children: ReactNode; className?: string }) {
  const Icon = tone === 'teal' ? Users : tone === 'indigo' ? Layers : Briefcase;
  return <Card className={`opp-panel opp-${tone} ${className}`}><CardHeader><div className="flex items-center gap-3"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground"><Icon className="size-4" aria-hidden="true" /></span><div><CardTitle className="text-base">{title}</CardTitle>{description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}</div></div></CardHeader><CardContent>{children}</CardContent></Card>;
}
export function Field({ label, value, onChange, type = 'text', required = false, multiline = false, disabled = false, hint }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean; multiline?: boolean; disabled?: boolean; hint?: string }) {
  const id = useId();
  return <div className="min-w-0 space-y-1.5"><Label htmlFor={id}>{label}{required && <span className="text-destructive"> *</span>}</Label>{multiline ? <Textarea id={id} value={value} onChange={e => onChange(e.target.value)} disabled={disabled} required={required} /> : <Input id={id} type={type} value={value} onChange={e => onChange(e.target.value)} disabled={disabled} required={required} min={type === 'number' ? '0' : undefined} step={type === 'number' ? 'any' : undefined} />}{hint && <p className="text-xs text-muted-foreground">{hint}</p>}</div>;
}
export function Choice({ label, value, onChange, options, disabled = false, required = false }: { label: string; value: string; onChange: (value: string) => void; options: LookupOption[]; disabled?: boolean; required?: boolean }) {
  const id = useId();
  return <div className="min-w-0 space-y-1.5"><Label htmlFor={id}>{label}{required && <span className="text-destructive"> *</span>}</Label><Select value={value} onValueChange={onChange} disabled={disabled}><SelectTrigger id={id} aria-label={label} aria-required={required}><SelectValue placeholder="Select…" /></SelectTrigger><SelectContent>{options.filter(x => x.id).map(x => <SelectItem key={x.id} value={x.id}>{x.label}</SelectItem>)}</SelectContent></Select></div>;
}
export function options(values: string[]): LookupOption[] { return values.map(x => ({ id: x, label: x })); }
export function Notice({ error, title = 'Unable to complete this action', retry }: { error: string | Error; title?: string; retry?: () => void }) {
  return <Alert variant="destructive" role="alert"><AlertTitle>{title}</AlertTitle><AlertDescription>{typeof error === 'string' ? error : error.message}{retry && <Button type="button" variant="outline" size="sm" className="ml-3 mt-2" onClick={retry}>Retry</Button>}</AlertDescription></Alert>;
}
export function Loading({ label = 'Loading opportunity…' }: { label?: string }) { return <div role="status" className="flex items-center gap-2 py-12 text-sm text-muted-foreground"><Spinner className="size-4" />{label}</div>; }
export function Status({ state }: { state: OpportunityState }) { return <Badge className={`opp-status opp-state-${state}`}>{STATE_LABELS[state]}</Badge>; }
export function Values({ values }: { values: [string, ReactNode][] }) {
  return <dl className="opp-values">{values.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value === null || value === undefined || value === '' ? 'Not provided' : value}</dd></div>)}</dl>;
}
