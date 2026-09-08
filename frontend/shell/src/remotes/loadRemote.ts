import { lazy, Suspense, type ComponentType, type ReactElement } from "react";

export function loadRemote(
  importFn: () => Promise<{ default: ComponentType }>
): () => ReactElement {
  const RemoteComponent = lazy(importFn);
  return function RemoteBoundary() {
    return (
      <Suspense fallback={<div className="remote-loading">Loading…</div>}>
        <RemoteComponent />
      </Suspense>
    );
  };
}
