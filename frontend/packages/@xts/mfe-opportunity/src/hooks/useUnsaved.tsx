import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@xts/design-system';

const UnsavedContext = createContext<{ register: (id: string, dirty: boolean) => void; confirm: () => Promise<boolean> }>({ register: () => {}, confirm: async () => true });
export function UnsavedProvider({ children }: { children: ReactNode }) {
  const entries = useRef(new Map<string, boolean>());
  const [promptOpen, setPromptOpen] = useState(false);
  const pending = useRef<((allowed: boolean) => void) | null>(null);
  const location = useLocation();
  const currentHistory = useRef({ index: window.history.state?.idx ?? 0, state: window.history.state, url: window.location.href });
  useEffect(() => { currentHistory.current = { index: window.history.state?.idx ?? 0, state: window.history.state, url: window.location.href }; }, [location]);
  const dirty = () => [...entries.current.values()].some(Boolean);
  const confirm = useCallback(() => {
    if (![...entries.current.values()].some(Boolean)) return Promise.resolve(true);
    return new Promise<boolean>(resolve => { pending.current?.(false); pending.current = resolve; setPromptOpen(true); });
  }, []);
  function answer(allowed: boolean) { const resolve = pending.current; pending.current = null; setPromptOpen(false); resolve?.(allowed); }
  useEffect(() => () => { pending.current?.(false); }, []);
  const register = useCallback((id: string, value: boolean) => { if (value) entries.current.set(id, true); else entries.current.delete(id); }, []);
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => { if (dirty()) { event.preventDefault(); event.returnValue = ''; } };
    let bypassClick = false, bypassPop = false;
    const click = (event: MouseEvent) => {
      if (bypassClick || !dirty()) return;
      const anchor = (event.target as Element | null)?.closest('a[href]') as HTMLAnchorElement | null;
      if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download') || event.ctrlKey || event.metaKey || event.shiftKey || event.button !== 0 || anchor.href === window.location.href) return;
      event.preventDefault(); event.stopPropagation();
      void confirm().then(allowed => { if (allowed && anchor.isConnected) { bypassClick = true; anchor.click(); bypassClick = false; } });
    };
    let restoring = false;
    const popstate = (event: PopStateEvent) => {
      const nextIndex = event.state?.idx ?? 0;
      if (restoring) { restoring = false; event.stopImmediatePropagation(); return; }
      if (bypassPop) { bypassPop = false; return; }
      if (dirty()) {
        event.stopImmediatePropagation();
        const delta = currentHistory.current.index - nextIndex;
        if (delta) { restoring = true; window.history.go(delta); }
        else window.history.replaceState(currentHistory.current.state, '', currentHistory.current.url);
        void confirm().then(allowed => {
          if (!allowed) return;
          if (delta) { bypassPop = true; window.history.go(-delta); }
        });
      }
    };
    // Capture runs before BrowserRouter's popstate listener, preserving drafts
    // when Back is cancelled. Link capture also covers the shared shell sidebar.
    document.addEventListener('click', click, true);
    window.addEventListener('beforeunload', beforeUnload);
    window.addEventListener('popstate', popstate, true);
    return () => { document.removeEventListener('click', click, true); window.removeEventListener('beforeunload', beforeUnload); window.removeEventListener('popstate', popstate, true); };
  }, [confirm]);
  return <UnsavedContext.Provider value={{ register, confirm }}>{children}<Dialog open={promptOpen} onOpenChange={open => { if (!open) answer(false); }}><DialogContent className="opp-dialog max-w-md"><DialogHeader><DialogTitle>Leave without saving?</DialogTitle><DialogDescription>Your unsaved changes will be lost.</DialogDescription></DialogHeader><DialogFooter><Button type="button" variant="outline" onClick={() => answer(false)}>Keep editing</Button><Button type="button" variant="destructive" onClick={() => answer(true)}>Discard changes</Button></DialogFooter></DialogContent></Dialog></UnsavedContext.Provider>;
}
export function useUnsaved(dirty: boolean) {
  const id = useId(), { register, confirm } = useContext(UnsavedContext);
  useEffect(() => { register(id, dirty); return () => register(id, false); }, [id, dirty, register]);
  return confirm;
}
