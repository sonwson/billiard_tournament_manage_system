const ROLES = {
  USER: 'user',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin',
  TOURNAMENT_ADMIN: 'tournament_admin',
};

const ADMIN_ROLES = [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.TOURNAMENT_ADMIN];

function isSuperAdminRole(role) {
  return [ROLES.ADMIN, ROLES.SUPER_ADMIN].includes(role);
}

module.exports = {
  ROLES,
  ADMIN_ROLES,
  isSuperAdminRole,
};
