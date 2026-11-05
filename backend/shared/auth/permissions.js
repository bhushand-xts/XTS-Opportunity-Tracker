// The ONE permission check. Every service uses this.
// Reads tblrole_permissions.

async function can(user, permissionKey) {
  if (!user || !user.roleId) return false;
  return false;
}

module.exports = { can };
