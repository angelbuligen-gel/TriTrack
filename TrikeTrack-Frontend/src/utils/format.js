export function formatDate(value, options = {}) {
  if (!value) {
    return '—'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '—'
  }

  return date.toLocaleString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  })
}

export function humanizeStatus(status) {
  if (!status) {
    return 'Unknown'
  }

  return status
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export function humanizeRole(role) {
  const labels = {
    franchisee: 'Franchisee',
    bplo: 'BPLO Personnel',
    treasury: 'Treasury Personnel',
    administrator: 'Administrator',
  }

  return labels[role] || humanizeStatus(role)
}
