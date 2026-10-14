import { useEffect, useSyncExternalStore } from "react";

/**
 * Lets any page — including ones rendered inside a federated remote MFE —
 * set the title shown in AppShell's shared header. Module-level state (not
 * React context) so it works the same way useAuth()/useStore() already do
 * across the MFE boundary: @xts/design-system is a Module Federation
 * singleton, so this module instance — and its state — is genuinely shared
 * between app-shell and every MFE that loads it.
 */
const DEFAULT_TITLE = "XTS Opportunity Tracker";

let title: string = DEFAULT_TITLE;
const listeners = new Set<() => void>();

function setTitle(next: string) {
  title = next;
  listeners.forEach((listener) => listener());
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
function getSnapshot() {
  return title;
}

/** Reads the current page title — used by AppShell's header. */
export function usePageTitle(): string {
  return useSyncExternalStore(subscribe, getSnapshot, () => DEFAULT_TITLE);
}

/** Sets the page title for as long as the calling page is mounted, resetting
 * to the app default on unmount. Call once near the top of each page. */
export function useSetPageTitle(pageTitle: string): void {
  useEffect(() => {
    setTitle(pageTitle);
    return () => setTitle(DEFAULT_TITLE);
  }, [pageTitle]);
}
