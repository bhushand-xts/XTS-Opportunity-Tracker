import { useFieldError } from './FieldValidation';
import { useId, type ReactNode } from 'react';
import { ArrowUpRight, Briefcase, Layers, Users, type LucideIcon } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle, Badge, type BadgeProps, Button, Card, CardContent, CardHeader, CardTitle, cn, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, Spinner, Textarea } from '@xts/design-system';
import type { LookupOption, OpportunitySummary } from '@xts/api-contracts';
import { SearchableSelect } from './SearchableSelect';
import { opportunityStatus } from '../lib/opportunityStatus';

// Decorative only: a vibrant, deterministic accent for an initials avatar. Carries no data of its own.
export const AVATAR_ACCENTS = ['bg-violet-600', 'bg-blue-600', 'bg-emerald-700', 'bg-amber-600', 'bg-pink-600', 'bg-cyan-600'];
export function avatarAccent(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_ACCENTS[hash % AVATAR_ACCENTS.length];
}
export function initials(name: string) {
  const [first, second] = name.trim().split(/\s+/);
  return (`${first?.[0] ?? ''}${second?.[0] ?? first?.[1] ?? ''}`).toUpperCase();
}
export const PRIORITY_BADGE: Record<string, { label: string; variant: BadgeProps['variant'] }> = { LOW: { label: 'Low', variant: 'success' }, MEDIUM: { label: 'Medium', variant: 'warning' }, HIGH: { label: 'High', variant: 'critical' } };
/** Formats a date-only (YYYY-MM-DD) value as "31 Oct 2026" without any UTC shift. */
export function formatLocalDate(value: string | null | undefined): string | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** `icon`/`accentIcon`/`headerRight` are opt-in overrides — existing callers that omit them keep today's exact look. */
export function Panel({ title, description, tone = 'violet', icon, accentIcon = false, headerRight, children, className = '' }: { title: string; description?: ReactNode; tone?: 'violet' | 'indigo' | 'teal' | 'amber' | 'rose' | 'cyan' | 'emerald' | 'neutral'; icon?: LucideIcon; accentIcon?: boolean; headerRight?: ReactNode; children: ReactNode; className?: string }) {
  const Icon = icon ?? (tone === 'teal' ? Users : tone === 'indigo' ? Layers : Briefcase);
  return <Card className={`opp-panel opp-${tone} ${className}`}><CardHeader><div className="flex items-center justify-between gap-2"><div className="flex items-center gap-2"><span className={`grid size-7 shrink-0 place-items-center rounded-lg ${accentIcon ? `opp-panel-icon-${tone}` : 'bg-accent text-accent-foreground'}`}><Icon className="size-4" aria-hidden="true" /></span><div><CardTitle className="text-sm">{title}</CardTitle>{description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}</div></div>{headerRight}</div></CardHeader><CardContent>{children}</CardContent></Card>;
}
export function Field({ label, value, onChange, type = 'text', required = false, multiline = false, disabled = false, hint, min, max, step }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean; multiline?: boolean; disabled?: boolean; hint?: string; min?: number | string; max?: string; step?: number }) {
  const id = useId(), error = useFieldError(label);
  return <div className="opp-field min-w-0 space-y-1"><Label htmlFor={id} className={error ? 'text-destructive' : undefined}>{label}{required && <span className="text-destructive"> *</span>}</Label>{multiline ? <Textarea id={id} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} value={value} onChange={e => onChange(e.target.value)} disabled={disabled} required={required} /> : <Input id={id} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} type={type} value={value} onChange={e => onChange(e.target.value)} disabled={disabled} required={required} min={type === 'number' ? min ?? 0 : type === 'date' ? min : undefined} max={type === 'date' ? max : undefined} step={type === 'number' ? step ?? 'any' : undefined} />}{error && <p id={`${id}-error`} role="alert" className="text-xs text-destructive">{error}</p>}{hint && <p className="text-xs text-muted-foreground">{hint}</p>}</div>;
}
export function Choice({ label, value, onChange, options, disabled = false, required = false, searchable = false }: { label: string; value: string; onChange: (value: string) => void; options: LookupOption[]; disabled?: boolean; required?: boolean; searchable?: boolean }) {
  const id = useId(), error = useFieldError(label);
  if (searchable) return <div className="opp-field min-w-0 space-y-1"><Label htmlFor={id} className={error ? 'text-destructive' : undefined}>{label}{required && <span className="text-destructive"> *</span>}</Label><SearchableSelect id={id} label={label} value={value} options={options} onChange={onChange} disabled={disabled} required={required} error={error} />{error && <p id={`${id}-error`} role="alert" className="text-xs text-destructive">{error}</p>}</div>;
  return <div className="opp-field min-w-0 space-y-1"><Label htmlFor={id} className={error ? 'text-destructive' : undefined}>{label}{required && <span className="text-destructive"> *</span>}</Label><Select value={value} onValueChange={onChange} disabled={disabled}><SelectTrigger id={id} aria-label={label} aria-required={required} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined}><SelectValue placeholder="Select…" /></SelectTrigger><SelectContent>{options.filter(x => x.id).map(x => <SelectItem key={x.id} value={x.id}>{x.label}</SelectItem>)}</SelectContent></Select>{error && <p id={`${id}-error`} role="alert" className="text-xs text-destructive">{error}</p>}</div>;
}
export function options(values: string[]): LookupOption[] { return values.map(x => ({ id: x, label: x })); }
export function Notice({ error, title = 'Unable to complete this action', retry }: { error: string | Error; title?: string; retry?: () => void }) {
  return <Alert variant="destructive" role="alert"><AlertTitle>{title}</AlertTitle><AlertDescription>{typeof error === 'string' ? error : error.message}{retry && <Button type="button" variant="outline" size="sm" className="ml-3 mt-2" onClick={retry}>Retry</Button>}</AlertDescription></Alert>;
}
export function Loading({ label = 'Loading opportunity…' }: { label?: string }) { return <div role="status" className="flex items-center gap-2 py-12 text-sm text-muted-foreground"><Spinner className="size-4" />{label}</div>; }
/** `hideStage` drops the stage line when a substage is present — for contexts (e.g. a pipeline
 * column already labelled with the stage) where repeating the stage name would be redundant. */
export function Status(opportunity: Pick<OpportunitySummary, 'state' | 'stageId' | 'subStageId'> & { size?: 'default' | 'sm'; hideStage?: boolean }) {
  const { stage, substage } = opportunityStatus(opportunity);
  const showStage = !opportunity.hideStage || !substage;
  return <div className="inline-flex max-w-full flex-col items-start gap-1" aria-label={substage ? `${stage} — ${substage}` : stage}>
    {showStage && <span className="text-xs font-medium text-foreground">{stage}</span>}
    {substage && <span className="text-xs text-muted-foreground">{substage}</span>}
  </div>;
}
export function OpportunityNumber({ number }: { number: string }) {
  return <span className="opp-opportunity-number" aria-label={`Opportunity number ${number}`}><span>Opportunity no.</span><strong>{number}</strong></span>;
}
export function Values({ values }: { values: [string, ReactNode][] }) {
  return <dl className="opp-values">{values.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value === null || value === undefined || value === '' ? 'Not provided' : value}</dd></div>)}</dl>;
}
/** Slide-out panel for a Panel's full reference detail — the card itself keeps just a scannable summary.
 * `trigger` swaps the default outline button for a custom opener (e.g. a plain text link); it still gets the same accessible name. */
export function DetailDrawer({ title, description, trigger, children }: { title: string; description?: string; trigger?: ReactNode; children: ReactNode }) {
  return <Sheet><SheetTrigger asChild>{trigger ?? <Button type="button" variant="secondary" size="sm" className="gap-1 rounded-full px-3 shadow-none" aria-label={`View details — ${title}`}>View details<ArrowUpRight className="size-3.5" aria-hidden="true" /></Button>}</SheetTrigger><SheetContent className="opp-drawer flex w-full flex-col sm:max-w-xl"><SheetHeader><SheetTitle>{title}</SheetTitle>{description && <SheetDescription>{description}</SheetDescription>}</SheetHeader><div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-2">{children}</div></SheetContent></Sheet>;
}
/** Small link-styled drawer opener (e.g. "View solicitation ↗") for panels that want an inline link instead of the default button. */
export function DetailDrawerLink({ label }: { label: string }) {
  return <button type="button" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">{label} <span aria-hidden="true">↗</span></button>;
}
