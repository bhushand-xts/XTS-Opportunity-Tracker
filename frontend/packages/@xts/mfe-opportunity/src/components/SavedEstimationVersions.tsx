import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Eye, Info, Pencil, Trash2 } from 'lucide-react';
import type { EstimationVersion } from '@xts/api-contracts';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, Badge, Button, Dialog, DialogContent, Input, Label, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@xts/design-system';
import { useOpportunityService } from '../services/OpportunityService';
import { useResource } from '../hooks/useResource';
import { money } from '../lib/workflow';
import { Notice, Panel } from './ui';
import { EstimationVersionView } from './EstimationVersionView';

export function SavedEstimationVersions({ opportunityId, revision, editable, saving, dirty, onSave, onLoad, onDelete, submitAction, selectedVersion, onSelectVersion, sidebarTarget, selectionLocked = false, submittedOnly = false }: {
  opportunityId: string; revision: number; editable: boolean; saving: boolean; dirty: boolean;
  submitAction?: ReactNode;
  sidebarTarget?: HTMLElement | null;
  selectedVersion?: EstimationVersion | null; onSelectVersion?: (version: EstimationVersion | null) => void;
  onSave: (name: string, source?: EstimationVersion) => Promise<boolean>; onLoad: (version: EstimationVersion) => boolean | void;
  onDelete?: (version: EstimationVersion) => Promise<boolean>;
  selectionLocked?: boolean;
  submittedOnly?: boolean;
}) {
  const service = useOpportunityService();
  const [name, setName] = useState('');
  const [editing, setEditing] = useState<EstimationVersion>();
  const [deleting, setDeleting] = useState<EstimationVersion>();
  const [opening, setOpening] = useState(false);
  const [openingError, setOpeningError] = useState<Error>();
  const [selectionBlocked, setSelectionBlocked] = useState(false);
  const lockRef = useRef(selectionLocked);
  lockRef.current = selectionLocked;
  useEffect(() => { setSelectionBlocked(false); }, [opportunityId, selectionLocked]);
  function select(version: EstimationVersion) {
    if (lockRef.current) { setSelectionBlocked(true); return; }
    void openVersion(version, current => {
      if (lockRef.current) { setSelectionBlocked(true); return; }
      onSelectVersion?.(current);
    });
  }
  async function openVersion(saved: EstimationVersion, action: (current: EstimationVersion) => void) {
    setOpening(true); setOpeningError(undefined);
    try {
      if (!service.estimationVersion) throw new Error('Saved estimate details are unavailable. Please retry.');
      action(await service.estimationVersion(opportunityId, saved.id));
    } catch (error) { setOpeningError(error instanceof Error ? error : new Error('The estimate could not be opened.')); }
    finally { setOpening(false); }
  }
  function edit(version: EstimationVersion) {
    void openVersion(version, current => { if (onLoad(current) !== false) { setEditing(current); setName(current.name); } });
  }
  const [viewing, setViewing] = useState<EstimationVersion>();
  const [loadingVersion, setLoadingVersion] = useState<EstimationVersion>();
  const load = useCallback(() => service.estimationVersions ? service.estimationVersions(opportunityId) : Promise.resolve([]), [service, opportunityId, revision]);
  const versions = useResource(load);
  const visibleVersions = versions.data?.filter(version => !submittedOnly || version.isSelected && version.status === 'SUBMITTED');
  const selectedId = selectionLocked ? visibleVersions?.find(version => version.isSelected && version.status === 'SUBMITTED')?.id ?? selectedVersion?.id : selectedVersion?.id;
  const actions = editable && <section aria-label="Estimation actions" className={sidebarTarget ? "flex flex-wrap items-end gap-3 rounded-lg border bg-card p-3" : "mt-3 flex flex-wrap items-end gap-3 border-t pt-3"}>
      <div className="w-full sm:w-72 sm:max-w-sm sm:flex-1"><Label htmlFor={`estimate-name-${opportunityId}`}>Estimation name</Label><Input id={`estimate-name-${opportunityId}`} className="mt-1" placeholder="Estimation name" maxLength={500} value={name} onChange={event => setName(event.target.value)} disabled={saving || opening} /></div>
      <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:ml-auto sm:w-auto">
      <Button type="button" variant="secondary" disabled={saving || !name.trim()} onClick={async () => { if (await onSave(name.trim(), editing)) { setName(''); setEditing(undefined); versions.reload(); } }}>{editing ? 'Update' : 'Save Estimation'}</Button>
      {editing && <Button type="button" variant="outline" disabled={saving || opening} onClick={() => { setEditing(undefined); setName(''); }}>Save as new instead</Button>}
      {!sidebarTarget && submitAction}
      </div>
      {editing && <p role="status" className="w-full text-xs text-muted-foreground">Editing {editing.name} (V{editing.version}). Update saves changes to this estimate; its previous data is kept in history.</p>}
    </section>;
  const savedPanel = <Panel title="Saved estimations" tone="indigo" headerRight={visibleVersions?.length ? <Badge variant="muted">{visibleVersions.length} saved</Badge> : undefined}>
    {openingError && <Notice error={openingError} />}
    {selectionBlocked && <div role="status" className="mb-2 flex items-center gap-2 rounded-md bg-primary/5 px-3 py-2 text-xs text-muted-foreground"><Info className="size-4 shrink-0 text-primary" aria-hidden="true" /><span>Estimation already submitted.</span></div>}
    {versions.error ? <Notice error={versions.error} retry={versions.reload} /> : versions.loading ? <p role="status" className="text-sm text-muted-foreground">Loading saved estimations…</p> : !visibleVersions?.length ? <p className="text-sm text-muted-foreground">{submittedOnly ? 'No selected estimation has been submitted yet.' : 'No saved versions yet. Enter a name and choose Save Estimation to create a version.'}</p> : sidebarTarget ? <ul aria-label="Saved estimation versions" className="space-y-2">{visibleVersions.map(version => <li key={version.id} className={`rounded-lg border px-2 py-2 ${selectedId === version.id ? 'border-primary bg-primary/5' : 'bg-card'}`}>
      <div className="flex items-center gap-1.5">
        {editable && <input type="radio" name={`estimate-selection-${opportunityId}`} aria-label={`Select ${version.name} version ${version.version} for CEO review`} className="size-3.5 shrink-0 cursor-pointer accent-primary disabled:cursor-not-allowed" checked={selectedId === version.id} disabled={saving || opening || versions.loading} onChange={() => select(version)} />}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-1">
            <div className="flex min-w-0 flex-1 items-center gap-1"><span className="min-w-0 truncate text-xs font-medium" title={version.name}>{version.name}</span><span className="flex shrink-0 items-center gap-1"><Badge variant="muted" className="border-primary/20 bg-primary/10 px-1.5 py-0 text-[10px] text-primary">V{version.version}</Badge><Badge variant="muted" className="whitespace-nowrap px-1.5 py-0 text-[10px]">{new Date(version.createdAt).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}</Badge>{version.status === 'SUBMITTED' && <Badge variant="muted" className="px-1.5 py-0 text-[10px]">Submitted</Badge>}</span></div>
            <div className="flex shrink-0 items-center gap-0.5">
              <Button type="button" size="icon" variant="ghost" className="size-6 text-primary" aria-label={`View ${version.name} version ${version.version}`} title="View estimate" onClick={() => void openVersion(version, setViewing)}><Eye className="size-3.5" aria-hidden="true" /></Button>
              {editable && <><Button type="button" size="icon" variant="ghost" className="size-6" aria-label={`Edit ${version.name} version ${version.version}`} title="Edit" disabled={saving || opening} onClick={() => { if (dirty) setLoadingVersion(version); else edit(version); }}><Pencil className="size-3.5" aria-hidden="true" /></Button>{onDelete && version.status !== 'SUBMITTED' && <Button type="button" size="icon" variant="ghost" className="size-6 text-destructive" aria-label={`Delete ${version.name} version ${version.version}`} title="Delete" disabled={saving || opening} onClick={() => setDeleting(version)}><Trash2 className="size-3.5" aria-hidden="true" /></Button>}</>}
            </div>
          </div>
        </div>
      </div>
    </li>)}</ul> : <div className="overflow-x-auto"><Table>
      <TableHeader><TableRow><TableHead>Estimation / version</TableHead><TableHead className="text-right whitespace-nowrap">Person-weeks</TableHead><TableHead className="text-right whitespace-nowrap">Total cost</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
      <TableBody>{visibleVersions.map(version => <TableRow key={version.id} className={selectedId === version.id ? 'bg-primary/5' : undefined}>
        <TableCell><div className="flex items-center gap-3">{editable && <input type="radio" name={`estimate-selection-${opportunityId}`} aria-label={`Select ${version.name} version ${version.version} for CEO review`} className="size-4 cursor-pointer accent-primary disabled:cursor-not-allowed" checked={selectedId === version.id} disabled={saving || opening || versions.loading} onChange={() => select(version)} />}
        <div className="min-w-0"><div className="flex flex-wrap items-center gap-1.5"><span className="font-medium break-words">{version.name}</span> <Badge variant="muted">V{version.version}</Badge>{version.status === 'SUBMITTED' && <Badge variant="muted" className="ml-1">Submitted</Badge>}</div><p className="mt-0.5 text-xs text-muted-foreground">{new Date(version.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}{' \u00b7 '}User {version.createdBy}</p></div></div></TableCell>
        <TableCell className="text-right tabular-nums">{Number(version.personWeeks)}</TableCell><TableCell className="text-right whitespace-nowrap font-medium tabular-nums">{money(version.estimation.total, version.currencyCode)}</TableCell>
        <TableCell><div className="flex justify-end gap-1.5"><Button type="button" size="sm" variant="outline" onClick={() => void openVersion(version, setViewing)}>View</Button>{editable && <><Button type="button" size="sm" variant="outline" disabled={saving || opening} onClick={() => { if (dirty) setLoadingVersion(version); else edit(version); }}>Edit</Button>{onDelete && version.status !== 'SUBMITTED' && <Button type="button" size="sm" variant="outline" className="text-destructive" disabled={saving || opening} onClick={() => setDeleting(version)}>Delete</Button>}</>}</div></TableCell>
      </TableRow>)}</TableBody>
    </Table></div>}
    {editable && !sidebarTarget && !selectionLocked && <p className="mt-2 text-xs text-muted-foreground">{selectedVersion ? `Selected for CEO review: ${selectedVersion.name} \u00b7 V${selectedVersion.version}` : 'Select a saved estimation to enable Submit to CEO.'}</p>}
    {sidebarTarget && submitAction && <div className="mt-2">{submitAction}</div>}
    <Dialog open={Boolean(viewing)} onOpenChange={open => { if (!open) setViewing(undefined); }}><DialogContent className="max-h-[90dvh] max-w-5xl grid-rows-[auto_minmax(0,1fr)_auto] gap-4 p-4 sm:p-6">
      {viewing && <EstimationVersionView version={viewing} />}
    </DialogContent></Dialog>
    <AlertDialog open={Boolean(loadingVersion)} onOpenChange={open => { if (!open) setLoadingVersion(undefined); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Replace unsaved estimate inputs?</AlertDialogTitle><AlertDialogDescription>Editing replaces your unsaved inputs with the latest saved estimate and its saved rates. Update changes the same estimate and keeps its previous data in history.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => { if (loadingVersion) edit(loadingVersion); setLoadingVersion(undefined); }}>Edit version</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    <AlertDialog open={Boolean(deleting)} onOpenChange={open => { if (!open && !saving) setDeleting(undefined); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete saved estimate?</AlertDialogTitle><AlertDialogDescription>Delete {deleting?.name} (V{deleting?.version}) from saved estimations? It will no longer be available for CEO submission. Its audit record will be retained.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={saving || opening}>Cancel</AlertDialogCancel><Button variant="destructive" disabled={saving || opening} onClick={async () => {
      if (deleting && onDelete && await onDelete(deleting)) {
        if (editing?.id === deleting.id) { setEditing(undefined); setName(''); }
        setDeleting(undefined); versions.reload();
      }
    }}>{saving ? 'Deleting...' : 'Delete estimate'}</Button></AlertDialogFooter></AlertDialogContent></AlertDialog>
    {!sidebarTarget && actions}
  </Panel>;
  return sidebarTarget ? <>{actions}{createPortal(savedPanel, sidebarTarget)}</> : savedPanel;
}
