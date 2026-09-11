// Runtime Contract - injected by App Shell into each MFE
export interface RuntimeContext {
  user: {
    id: string;
    name: string;
    email: string;
    roles: string[];
  };
  permissions: string[];
  scope: string;
  tokenAccessor: () => Promise<string>;
  logout: () => void;
}

export interface MFERuntime {
  getContext: () => RuntimeContext;
  navigate: (path: string, params?: Record<string, any>) => void;
  publishEvent: (eventName: string, payload: any) => void;
  subscribe: (eventName: string, handler: Function) => () => void;
}

declare global {
  interface Window {
    MFE_RUNTIME: MFERuntime;
  }
}

export {};
