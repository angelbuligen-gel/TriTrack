import { humanizeStatus } from '../utils/format'

const TONES = {
  active: 'success',
  pending: 'warning',
  for_renewal: 'warning',
  expired: 'danger',
  suspended: 'danger',
  cancelled: 'danger',
  transferred: 'info',
  rejected: 'danger',
  replaced: 'info',
  retired: 'danger',
  ended: 'info',
  submitted: 'info',
  under_review: 'warning',
  documents_pending: 'warning',
  approved: 'success',
  completed: 'success',
  missing: 'info',
  successful: 'success',
  paid: 'success',
  failed: 'danger',
  refunded: 'info',
  verified: 'success',
  processing: 'warning',
}

export default function StatusBadge({ value }) {
  const tone = TONES[value] || 'info'

  return <span className={`badge badge--${tone}`}>{humanizeStatus(value)}</span>
}
