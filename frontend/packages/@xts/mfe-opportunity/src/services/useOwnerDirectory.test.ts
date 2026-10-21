import { describe, expect, it } from 'vitest';
import { mapOwnerDirectory } from './useOwnerDirectory';
import type { OwnerDirectoryData } from './userDirectory.queries';

describe('Opportunity owner master-data mapping', () => {
  it('uses stable user IDs and descriptive roles without role-based eligibility filtering', () => {
    const data: OwnerDirectoryData = {
      userList: [
        { id: 42, firstName: ' Ada ', lastName: ' Lovelace ', email: 'ada@example.com', roleId: 7, isActive: true },
        { id: 84, firstName: 'Grace', lastName: null, email: 'grace@example.com', roleId: 8, isActive: true },
        { id: 85, firstName: null, lastName: null, email: 'no-role@example.com', roleId: null, isActive: true },
      ],
      rolesList: [
        { id: 7, roleName: 'Engineering', roleCode: 'ENG', isActive: true },
        { id: 8, roleName: 'Legacy team', roleCode: null, isActive: false },
      ],
    };
    expect(mapOwnerDirectory(data)).toEqual([
      { id: '42', name: 'Ada Lovelace', email: 'ada@example.com', roles: ['Engineering'], active: true },
      { id: '84', name: 'Grace', email: 'grace@example.com', roles: ['Legacy team (inactive)'], active: true },
      { id: '85', name: 'no-role@example.com', email: 'no-role@example.com', roles: [], active: true },
    ]);
  });

  it('retains inactive assignments, handles nullable list entries, and treats null active status as inactive', () => {
    expect(mapOwnerDirectory({
      userList: [null, { id: 19, firstName: null, lastName: null, email: 'legacy@example.com', roleId: 999, isActive: null }],
      rolesList: [null],
    })).toEqual([{ id: '19', name: 'legacy@example.com', email: 'legacy@example.com', roles: ['Role 999'], active: false }]);
    expect(mapOwnerDirectory(undefined)).toEqual([]);
  });
});
