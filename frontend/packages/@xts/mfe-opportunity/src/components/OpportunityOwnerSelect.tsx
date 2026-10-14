import { useFieldError } from './FieldValidation';
import { useId } from 'react';
import type { DirectoryUser } from '@xts/api-contracts';
import { Label, Spinner } from '@xts/design-system';
import { SearchableSelect } from './SearchableSelect';
import { useOwnerDirectory } from '../services/useOwnerDirectory';
import { Notice } from './ui';

function userLabel(user: DirectoryUser) {
  return user.name;
}

/** The Opportunity owner uses mst_user. Reviewer and approver eligibility stays separate. */
export function OpportunityOwnerSelect({ value, selected, onChange, disabled = false }: {
  value: string;
  selected?: DirectoryUser | null;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const id = useId(), error = useFieldError('Opportunity owner');
  const directory = useOwnerDirectory(!disabled);
  const assigned = directory.users.find(user => user.id === value) ?? (selected?.id === value ? selected : undefined);
  const activeUsers = directory.users.filter(user => user.active);
  const choices = [...activeUsers];
  if (assigned && !choices.some(user => user.id === assigned.id)) choices.unshift(assigned);
  const unknownAssigned = value && !choices.some(user => user.id === value);
  const blocked = disabled || directory.loading || Boolean(directory.error);
  return <div className="opp-field min-w-0 space-y-1">
    <Label htmlFor={id} className={error ? 'text-destructive' : undefined}>Opportunity owner <span className="text-destructive">*</span></Label>
    <SearchableSelect id={id} label="Opportunity owner" value={value} onChange={onChange} disabled={blocked} required error={error} placeholder="Select owner" options={[
      ...(unknownAssigned ? [{ id: value, label: `Assigned user ${value} · details unavailable`, disabled: true }] : []),
      ...choices.map(user => ({ id: user.id, label: userLabel(user), keywords: [user.email], disabled: !user.active })),
    ]} />
    {error && <p id={`${id}-error`} role="alert" className="text-xs text-destructive">{error}</p>}
    {!disabled && directory.loading && <p role="status" className="flex items-center gap-2 text-xs text-muted-foreground"><Spinner className="size-3" />Loading owner directory…</p>}
    {!disabled && directory.error && <Notice title="Owner directory unavailable" error={directory.error} retry={directory.reload} />}
    {!disabled && !directory.loading && !directory.error && activeUsers.length === 0 && <p role="status" className="text-xs text-muted-foreground">No active users are available to assign.</p>}
  </div>;
}
