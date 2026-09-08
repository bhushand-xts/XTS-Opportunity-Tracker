// The event contract: a typed, domain-namespaced wrapper over a shared
// event bus, so cross-module signals (e.g. Opportunity & Pipeline
// announcing a stage change that Approvals & Gates listens for) don't
// turn into direct imports between two independently-deployed remotes.

import mitt from "mitt";

type AnyPayload = Record<string, unknown> | undefined;

const bus = mitt<Record<string, AnyPayload>>();

export function createDomainEvents<T extends Record<string, string>>(
  domain: string,
  events: T
) {
  return {
    domain,
    events,
    emit: (event: string, payload?: AnyPayload) => bus.emit(event, payload),
    on: (event: string, handler: (payload: AnyPayload) => void) => bus.on(event, handler),
    off: (event: string, handler: (payload: AnyPayload) => void) => bus.off(event, handler),
  };
}

export const eventBus = bus;
