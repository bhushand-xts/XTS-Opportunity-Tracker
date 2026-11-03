import { useCallback, useState, type ReactNode } from 'react';
import type { EstimationVersion } from '@xts/api-contracts';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, Badge, Button, Dialog, DialogContent, Input, Label, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@xts/design-system';
import { useOpportunityService } from '../services/OpportunityService';
import { useResource } from '../hooks/useResource';
import { money } from '../lib/workflow';
import { Notice, Panel } from './ui';
import { EstimationVersionView } from './EstimationVersionView';

export function SavedEstimationVersions({ opportunityId, revision, editable, saving, dirty, onSave, onLoad, draftAction, submitAction }: {
  opportunityId: string; revision: number; editable: boolean; saving: boolean; dirty: boolean;
  draftAction?: ReactNode; submitAction?: ReactNode;
  onSave: (name: string) => Promise<boolean>; onLoad: (version: EstimationVersion) => void;
}) {
  const service = useOpportunityService();
  const [name, setName] = useState('');
  const [viewing, setViewing] = useState<EstimationVersion>();
  const [loadingVersion, setLoadingVersion] = useState<EstimationVersion>();
  const load = useCallback(() => service.estimationVersions ? service.estimationVersions(opportunityId) : Promise.resolve([]), [service, opportunityId, revision]);
  const versions = useResource(load);
  return <>
    {editable && <section aria-label="Estimation actions" className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-3">
      <div className="w-full sm:w-72 sm:max-w-sm sm:flex-1"><Label htmlFor={`estimate-name-${opportunityId}`}>Estimation name</Label><Input id={`estimate-name-${opportunityId}`} className="mt-1" placeholder="Estimation name" maxLength={150} value={name} onChange={event => setName(event.target.value)} disabled={saving} /></div>
      <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:ml-auto sm:w-auto">
      {draftAction}
      <Button type="button" variant="secondary" disabled={saving || !name.trim()} onClick={async () => { if (await onSave(name.trim())) { setName(''); versions.reload(); } }}>Save Estimation</Button>
      {submitAction}
      </div>
    </section>}
    <Panel title="Saved estimations" tone="indigo">
    {versions.error ? <Notice error={versions.error} retry={versions.reload} /> : versions.loading ? <p role="status" className="text-sm text-muted-foreground">Loading saved estimations…</p> : !versions.data?.length ? <p className="text-sm text-muted-foreground">No saved versions yet. Save Draft keeps your working estimate; Save Estimation creates a named version.</p> : <div className="overflow-x-auto"><Table>
      <TableHeader><TableRow><TableHead>Name / version</TableHead><TableHead>Saved on</TableHead><TableHead>Saved by</TableHead><TableHead>Person-weeks</TableHead><TableHead>Total cost</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
      <TableBody>{versions.data.map(version => <TableRow key={version.id}>
        <TableCell>{version.name} <Badge variant="muted">V{version.version}</Badge>{version.status === 'SUBMITTED' && <Badge variant="muted" className="ml-1">Submitted</Badge>}</TableCell>
        <TableCell>{new Date(version.createdAt).toLocaleString()}</TableCell><TableCell>User {version.createdBy}</TableCell><TableCell>{Number(version.personWeeks)}</TableCell><TableCell>{money(version.estimation.total, version.currencyCode)}</TableCell>
        <TableCell><div className="flex gap-2"><Button type="button" size="sm" variant="outline" onClick={() => setViewing(version)}>View</Button>{editable && <Button type="button" size="sm" variant="outline" disabled={saving} onClick={() => { if (dirty) setLoadingVersion(version); else onLoad(version); }}>Load</Button>}</div></TableCell>
      </TableRow>)}</TableBody>
    </Table></div>}
    <Dialog open={Boolean(viewing)} onOpenChange={open => { if (!open) setViewing(undefined); }}><DialogContent className="max-h-[90dvh] max-w-5xl grid-rows-[auto_minmax(0,1fr)_auto] gap-4 p-4 sm:p-6">
      {viewing && <EstimationVersionView version={viewing} />}
    </DialogContent></Dialog>
    <AlertDialog open={Boolean(loadingVersion)} onOpenChange={open => { if (!open) setLoadingVersion(undefined); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Replace unsaved estimate inputs?</AlertDialogTitle><AlertDialogDescription>Loading this version replaces your current unsaved inputs. The saved version stays unchanged. The editor uses current active master rates.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => { if (loadingVersion) onLoad(loadingVersion); setLoadingVersion(undefined); }}>Load version</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </Panel>
  </>;
}
