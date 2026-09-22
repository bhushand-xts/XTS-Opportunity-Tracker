/**
 * Placeholder in-memory store — SCAFFOLDING.
 * Ported alongside AppShell/DashboardContent/ClosureModal/etc. so they
 * type-check and render with something on screen. Replace with real
 * API-backed state (@xts/api-client) before shipping.
 */
import { useSyncExternalStore } from "react";
import type { Activity, Approval, Customer, HistoryEntry, Opportunity, Role, Stage, StoreUser } from "./mock-data";

interface Notification {
  id: string;
  text: string;
  date: string;
  read: boolean;
}

interface CurrentUser {
  id: string;
  name: string;
  initials: string;
  team: string;
}

interface StoreState {
  currentUser: CurrentUser;
  role: Role;
  search: string;
  customers: Customer[];
  users: StoreUser[];
  opportunities: Opportunity[];
  activities: Activity[];
  approvals: Approval[];
  history: HistoryEntry[];
  notifications: Notification[];
}

let state: StoreState = {
  currentUser: { id: "u1", name: "Bhushan Dixit", initials: "BD", team: "Enterprise West" },
  role: "Sales Manager",
  search: "",
  customers: [{ id: "cust-1", name: "Acme Corp", contactName: "Sam Rivera" }],
  users: [{ id: "u1", name: "Bhushan Dixit", team: "Enterprise West" }],
  opportunities: [],
  activities: [],
  approvals: [],
  history: [],
  notifications: [],
};

const listeners = new Set<() => void>();
function setState(patch: Partial<StoreState>) {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
function getSnapshot() {
  return state;
}

let idCounter = 1;
const nextId = (prefix: string) => `${prefix}-${idCounter++}`;

export function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function riskOf(opportunity: Opportunity): "soon" | "ok" {
  const days = (new Date(opportunity.expectedClose).getTime() - Date.now()) / 86_400_000;
  return days >= 0 && days <= 7 ? "soon" : "ok";
}

export function useStore() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  return {
    ...snapshot,
    visibleOpportunities: snapshot.opportunities,

    setSearch(value: string) {
      setState({ search: value });
    },
    markAllRead() {
      setState({ notifications: snapshot.notifications.map((n) => ({ ...n, read: true })) });
    },
    userById(id: string) {
      return snapshot.users.find((u) => u.id === id);
    },
    addOpportunity(entry: Omit<Opportunity, "id">) {
      setState({ opportunities: [...snapshot.opportunities, { ...entry, id: nextId("opp") }] });
    },
    updateOpportunity(id: string, patch: Partial<Opportunity>) {
      setState({
        opportunities: snapshot.opportunities.map((o) => (o.id === id ? { ...o, ...patch } : o)),
      });
    },
    moveStage(id: string, stage: Stage) {
      setState({ opportunities: snapshot.opportunities.map((o) => (o.id === id ? { ...o, stage } : o)) });
    },
    addActivity(entry: Omit<Activity, "id">) {
      setState({ activities: [...snapshot.activities, { ...entry, id: nextId("act") }] });
    },
    decideApproval(id: string, status: Approval["status"], note: string) {
      const approval = snapshot.approvals.find((a) => a.id === id);
      setState({
        approvals: snapshot.approvals.map((a) => (a.id === id ? { ...a, status } : a)),
        history: approval
          ? [
              ...snapshot.history,
              {
                id: nextId("hist"),
                opportunityId: approval.opportunityId,
                what: note,
                date: new Date().toISOString().slice(0, 10),
              },
            ]
          : snapshot.history,
      });
    },
  };
}
