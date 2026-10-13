import { useId } from 'react';
import type { DirectoryUser } from '@xts/api-contracts';
import { Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Spinner } from '@xts/design-system';
import { useOwnerDirectory } from '../services/useOwnerDirectory';
import { Notice } from './ui';

function userLabel(user: DirectoryUser) {
  return `${user.name}${user.email && user.name !== user.email ? ` · ${user.email}` : ''}${user.roles.length ? ` · ${user.roles.join(', ')}` : ''}${user.active ? '' : ' (inactive user)'}`;
}

/** The Opportunity owner uses mst_user. Reviewer and approver eligibility stays separate. */
export function OpportunityOwnerSelect({ value, selected, onChange, disabled = false }: {
  value: string;
  selected?: DirectoryUser | null;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const id = useId();
  const directory = useOwnerDirectory(!disabled);
  const assigned = directory.users.find(user => user.id === value) ?? (selected?.id === value ? selected : undefined);
  const activeUsers = directory.users.filter(user => user.active);
  const choices = [...activeUsers];
  if (assigned && !choices.some(user => user.id === assigned.id)) choices.unshift(assigned);
  const unknownAssigned = value && !choices.some(user => user.id === value);
  const blocked = disabled || directory.loading || Boolean(directory.error);
  return <div className="opp-field min-w-0 space-y-1">
    <Label htmlFor={id}>Opportunity owner</Label>
    <Select value={value} onValueChange={onChange} disabled={blocked}>
      <SelectTrigger id={id} aria-label="Opportunity owner" className="min-w-0 max-w-full" title={assigned ? userLabel(assigned) : undefined}><SelectValue placeholder="Select an active user" className="min-w-0 flex-1 truncate text-left" /></SelectTrigger>
      <SelectContent className="w-[var(--radix-select-trigger-width)] max-w-[calc(100vw-2rem)]">
        {unknownAssigned && <SelectItem value={value} disabled className="whitespace-normal break-words">Assigned user {value} · details unavailable</SelectItem>}
        {choices.map(user => <SelectItem key={user.id} value={user.id} disabled={!user.active} className="whitespace-normal break-words [&>span:last-child]:min-w-0">{userLabel(user)}</SelectItem>)}
      </SelectContent>
    </Select>
    {!disabled && directory.loading && <p role="status" className="flex items-center gap-2 text-xs text-muted-foreground"><Spinner className="size-3" />Loading owner directory…</p>}
    {!disabled && directory.error && <Notice title="Owner directory unavailable" error={directory.error} retry={directory.reload} />}
    {!disabled && !directory.loading && !directory.error && activeUsers.length === 0 && <p role="status" className="text-xs text-muted-foreground">No active users are available to assign.</p>}
  </div>;
}
