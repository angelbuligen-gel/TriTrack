const ROLE_HOME = {
  franchisee: '/app',
  bplo: '/bplo',
  treasury: '/treasury',
  administrator: '/admin',
}

export function homeRouteForRole(role) {
  return ROLE_HOME[role] || '/login'
}

export const STAFF_ROLES = ['bplo', 'treasury', 'administrator']
