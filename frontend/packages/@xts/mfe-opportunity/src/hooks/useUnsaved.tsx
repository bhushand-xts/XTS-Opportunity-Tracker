import { createContext, useCallback, useContext, useEffect, useId, useRef, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

const UnsavedContext = createContext<{ register: (id: string, dirty: boolean) => void; confirm: () => boolean }>({ register: () => {}, confirm: () => true });
export function UnsavedProvider({ children }: { children: ReactNode }) {
  const entries = useRef(new Map<string, boolean>());
  const location = useLocation();
  const currentHistory = useRef({ index: window.history.state?.idx ?? 0, state: window.history.state, url: window.location.href });
  useEffect(() => { currentHistory.current = { index: window.history.state?.idx ?? 0, state: window.history.state, url: window.location.href }; }, [location]);
  const dirty = () => [...entries.current.values()].some(Boolean);
  const confirm = useCallback(() => ![...entries.current.values()].some(Boolean) || window.confirm('Discard unsaved changes? Your unsaved answers and form edits will be lost.'), []);
  const register = useCallback((id: string, value: boolean) => { if (value) entries.current.set(id, true); else entries.current.delete(id); }, []);
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => { if (dirty()) { event.preventDefault(); event.returnValue = ''; } };
    const click = (event: MouseEvent) => {
      const anchor = (event.target as Element | null)?.closest('a[href]') as HTMLAnchorElement | null;
      if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download') || event.ctrlKey || event.metaKey || event.shiftKey || event.button !== 0 || anchor.href === window.location.href) return;
      if (!confirm()) { event.preventDefault(); event.stopPropagation(); }
    };
    let restoring = false;
    const popstate = (event: PopStateEvent) => {
      const nextIndex = event.state?.idx ?? 0;
      if (restoring) { restoring = false; event.stopImmediatePropagation(); return; }
      if (!confirm()) {
        event.stopImmediatePropagation();
        const delta = currentHistory.current.index - nextIndex;
        if (delta) { restoring = true; window.history.go(delta); }
        else window.history.replaceState(currentHistory.current.state, '', currentHistory.current.url);
      }
    };
    // Capture runs before BrowserRouter's popstate listener, preserving drafts
    // when Back is cancelled. Link capture also covers the shared shell sidebar.
    document.addEventListener('click', click, true);
    window.addEventListener('beforeunload', beforeUnload);
    window.addEventListener('popstate', popstate, true);
    return () => { document.removeEventListener('click', click, true); window.removeEventListener('beforeunload', beforeUnload); window.removeEventListener('popstate', popstate, true); };
  }, [confirm]);
  return <UnsavedContext.Provider value={{ register, confirm }}>{children}</UnsavedContext.Provider>;
}
export function useUnsaved(dirty: boolean) {
  const id = useId(), { register, confirm } = useContext(UnsavedContext);
  useEffect(() => { register(id, dirty); return () => register(id, false); }, [id, dirty, register]);
  return confirm;
}
