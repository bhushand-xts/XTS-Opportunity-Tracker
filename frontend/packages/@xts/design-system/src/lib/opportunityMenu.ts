import { gql } from '@apollo/client';

export interface OpportunityMenuRecord {
  menuId: number;
  menuName: string;
  menuKey: string;
  icon: string | null;
  parentId: number | null;
  sortOrder: number;
  routePath: string | null;
  isActive: boolean;
}

// Shared by the host sidebar and remote guard: real metadata, no fixed menu ID.
export const GET_OPPORTUNITY_MENUS = gql`
  query GetOpportunityMenus {
    menus(asTree: false) {
      menuId
      menuName
      menuKey
      icon
      parentId
      sortOrder
      routePath
      isActive
    }
  }
`;

const OPPORTUNITY_KEYS = new Set(['opportunity', 'opportunities', 'opportunity_management', 'opportunity_tracking']);
const normalize = (value: string) => value.trim().toLowerCase().replace(/[\s-]+/g, '_');

/** Preserve deep paths while supporting the real catalog's plural root. */
export function canonicalOpportunityPath(path: string): string | null {
  if (path === '/opportunity' || path.startsWith('/opportunity/')) return path;
  if (path === '/opportunities' || path.startsWith('/opportunities/')) return `/opportunity${path.slice('/opportunities'.length)}`;
  return null;
}

export function resolveOpportunityMenus(records: OpportunityMenuRecord[]): OpportunityMenuRecord[] {
  const byId = new Map(records.map(menu => [menu.menuId, menu]));
  function activeAncestors(menu: OpportunityMenuRecord): boolean {
    const seen = new Set<number>([menu.menuId]);
    let parentId = menu.parentId;
    while (parentId !== null) {
      if (seen.has(parentId)) return false;
      seen.add(parentId);
      const parent = byId.get(parentId);
      if (!parent?.isActive) return false;
      parentId = parent.parentId;
    }
    return true;
  }
  return records.filter(menu => {
    if (!menu.isActive || !activeAncestors(menu)) return false;
    // An explicit route belonging to another MFE wins over a matching label.
    if (menu.routePath && !canonicalOpportunityPath(menu.routePath)) return false;
    return Boolean(menu.routePath) || OPPORTUNITY_KEYS.has(normalize(menu.menuKey)) || OPPORTUNITY_KEYS.has(normalize(menu.menuName));
  }).sort((a, b) => {
    const primary = (menu: OpportunityMenuRecord) => normalize(menu.menuKey) === 'opportunities' ? 0 : 1;
    return primary(a) - primary(b) || a.sortOrder - b.sortOrder || a.menuId - b.menuId;
  });
}

export function hasOpportunityPermission(menus: OpportunityMenuRecord[], hasPermission: (menuKey: string, permission: string) => boolean, permission: string): boolean {
  return menus.some(menu => hasPermission(menu.menuKey, permission));
}
