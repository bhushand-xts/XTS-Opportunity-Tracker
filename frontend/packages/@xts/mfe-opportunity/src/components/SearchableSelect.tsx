import { useId, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import { Button, Input, Popover, PopoverContent, PopoverTrigger } from '@xts/design-system';
import type { LookupOption } from '@xts/api-contracts';

export type SearchableOption = LookupOption & { disabled?: boolean; keywords?: string[] };
export function SearchableSelect({ id, label, value, options, onChange, onOpenChange, disabled = false, required = false, error, placeholder = 'Select...' }: {
  id: string; label: string; value: string; options: SearchableOption[]; onChange: (value: string) => void;
  onOpenChange?: (open: boolean) => void; disabled?: boolean; required?: boolean; error?: string; placeholder?: string;
}) {
  const [open, setOpen] = useState(false), [search, setSearch] = useState(''), [active, setActive] = useState('');
  const listId = useId(), selected = options.find(option => option.id === value);
  const optionId = (optionValue: string) => `${listId}-${encodeURIComponent(optionValue)}`;
  const terms = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const filtered = options.filter(option => option.id && terms.every(term => [option.label, ...(option.keywords ?? [])].join(' ').toLowerCase().includes(term)));
  const enabled = filtered.filter(option => !option.disabled);
  const activeId = enabled.some(option => option.id === active) ? active : enabled[0]?.id;
  function toggle(next: boolean) { setOpen(next); setSearch(''); setActive(value); onOpenChange?.(next); }
  function select(option: SearchableOption) { if (!option.disabled) { onChange(option.id); toggle(false); } }
  return <Popover open={open && !disabled} onOpenChange={toggle}><PopoverTrigger asChild>
    <Button id={id} type="button" variant="outline" role="combobox" aria-label={label} aria-expanded={open && !disabled} aria-haspopup="dialog" aria-required={required} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} disabled={disabled} title={selected?.label} className="h-9 w-full min-w-0 justify-between gap-2 px-3 font-normal" onKeyDown={event => {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) { event.preventDefault(); toggle(true); }
    }}><span className={`min-w-0 flex-1 truncate text-left ${selected ? '' : 'text-muted-foreground'}`}>{selected?.label ?? placeholder}</span><ChevronDown className="size-4 shrink-0 opacity-50" /></Button>
  </PopoverTrigger><PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] max-w-[calc(100vw-2rem)] p-0">
    <div className="flex items-center gap-2 border-b px-3"><Search className="size-4 shrink-0 text-muted-foreground" /><Input aria-label={`Search ${label}`} placeholder={`Search ${label.toLowerCase()}...`} type="search" aria-controls={listId} aria-autocomplete="list" aria-activedescendant={activeId ? optionId(activeId) : undefined} value={search} onChange={event => { setSearch(event.target.value); setActive(''); }} className="h-10 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0" onKeyDown={event => {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault(); if (!enabled.length) return;
        const index = enabled.findIndex(option => option.id === activeId);
        const next = enabled[(index + (event.key === 'ArrowDown' ? 1 : -1) + enabled.length) % enabled.length];
        setActive(next.id); window.document.getElementById(optionId(next.id))?.scrollIntoView({ block: 'nearest' });
      } else if (event.key === 'Enter') {
        event.preventDefault(); const option = enabled.find(item => item.id === activeId); if (option) select(option);
      }
    }} /></div>
    <div id={listId} role="listbox" aria-label={`${label} options`} className="max-h-64 overflow-y-auto p-1">
      {filtered.map(option => <button id={optionId(option.id)} key={option.id} type="button" role="option" aria-selected={option.id === value} aria-disabled={Boolean(option.disabled)} disabled={option.disabled} tabIndex={-1} onMouseDown={event => event.preventDefault()} onMouseMove={() => { if (!option.disabled) setActive(option.id); }} onClick={() => select(option)} className={`flex w-full items-start gap-2 rounded px-2 py-2 text-left text-sm disabled:cursor-not-allowed disabled:opacity-50 ${option.id === activeId ? 'bg-accent text-accent-foreground' : ''}`}>
        <Check className={`mt-0.5 size-4 shrink-0 ${value === option.id ? 'opacity-100' : 'opacity-0'}`} /><span className="min-w-0 break-words">{option.label}</span>
      </button>)}
      {!filtered.length && <p role="status" className="px-3 py-5 text-center text-sm text-muted-foreground">No matching options.</p>}
    </div>
  </PopoverContent></Popover>;
}
