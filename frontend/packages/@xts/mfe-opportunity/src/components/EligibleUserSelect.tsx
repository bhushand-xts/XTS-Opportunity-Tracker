import { useCallback, useState } from 'react';
import type { DirectoryUser } from '@xts/api-contracts';
import { Button, Input } from '@xts/design-system';
import { useOpportunityService } from '../services/OpportunityService';
import { useDebounce, useResource } from '../hooks/useResource';
import { Choice, Loading, Notice } from './ui';

export function EligibleUserSelect({ label, opportunityId, purpose, value, selected, onChange, disabled = false }: { label: string; opportunityId: string | null; purpose: 'OWNER' | 'REVIEWER' | 'SALES_REVIEWER' | 'GATE1_APPROVER'; value: string; selected?: DirectoryUser | null; onChange: (value: string) => void; disabled?: boolean }) {
  const service = useOpportunityService(), [search, setSearch] = useState(''), [after, setAfter] = useState<string | null>(null), [expanded, setExpanded] = useState(false);
  const debounced = useDebounce(search);
  const load = useCallback((signal: AbortSignal) => service.eligibleUsers({ opportunityId, purpose, search: debounced, after }, signal), [service, opportunityId, purpose, debounced, after]);
  const resource = useResource(load, expanded && !disabled);
  const users = resource.data?.nodes.filter(u => u.active) ?? [];
  const choices = users.map(u => ({ id: u.id, label: `${u.name} · ${u.email}${u.roles.length ? ` · ${u.roles.join(', ')}` : ''}` }));
  if (selected && !choices.some(u => u.id === selected.id)) choices.unshift({ id: selected.id, label: `${selected.name} · ${selected.email}${selected.active ? '' : ' (inactive)'}` });
  if (value && !choices.some(u => u.id === value)) choices.unshift({ id: value, label: `Assigned user ${value} · details unavailable` });
  return <div className="space-y-2"><Choice label={label} value={value} options={choices} onChange={onChange} disabled={disabled || resource.loading || Boolean(resource.error)} />{!disabled && <Button type="button" variant="link" size="sm" onClick={() => setExpanded(x => !x)}>{expanded ? 'Hide directory search' : 'Find eligible users'}</Button>}{expanded && <><Input aria-label={`Search ${label.toLowerCase()}`} value={search} placeholder="Search name or email…" onChange={e => { setSearch(e.target.value); setAfter(null); }} />{resource.loading && <Loading label="Finding eligible users…" />}{resource.error && <Notice error={resource.error} retry={resource.reload} />}{resource.data && users.length === 0 && <p className="text-sm text-muted-foreground">No eligible active users found.</p>}{resource.data?.hasNextPage && <Button type="button" variant="outline" size="sm" onClick={() => setAfter(resource.data?.endCursor ?? null)}>More users</Button>}</>}</div>;
}
