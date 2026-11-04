export type SdTone = 'approved' | 'pending' | 'rejected' | 'cancelled'

export type SdMetric = {
  id: string
  label: string
  value: string
  delta: number
  /** Bar heights in percent, oldest first. First two render dimmed. */
  spark: number[]
}

export type SdApplicationRow = {
  id: string
  reference: string
  franchisee: string
  type: 'Renewal' | 'Transfer' | 'Change motor'
  status: SdTone
  statusLabel: string
  documents: number
  /** Assessed fee for the application type. */
  fee: number
  /** Assessed fee plus any late-filing surcharge. */
  total: number
}

export const sdMetrics: SdMetric[] = [
  { id: 'pending', label: 'Pending renewals', value: '48', delta: 12.4, spark: [38, 52, 46, 71, 88] },
  { id: 'approved', label: 'Approved this month', value: '126', delta: 6.8, spark: [44, 58, 63, 79, 95] },
  { id: 'collections', label: 'Collections', value: '₱268,900', delta: 3.2, spark: [61, 48, 67, 74, 84] },
  { id: 'turnaround', label: 'Avg. processing time', value: '2.4 days', delta: -14.5, spark: [82, 70, 66, 54, 41] },
]

export const sdVolume = [
  { month: 'Apr', submitted: 42, approved: 31 },
  { month: 'May', submitted: 51, approved: 38 },
  { month: 'Jun', submitted: 47, approved: 40 },
  { month: 'Jul', submitted: 63, approved: 49 },
  { month: 'Aug', submitted: 58, approved: 52 },
  { month: 'Sep', submitted: 66, approved: 54 },
  { month: 'Oct', submitted: 61, approved: 57 },
  { month: 'Nov', submitted: 71, approved: 57 },
]

export const sdCurrentMonth = 'Nov'

export const sdFees = [
  { label: 'Renewal fee', value: 412, share: 100 },
  { label: 'Transfer fee', value: 168, share: 58 },
  { label: 'Change motor', value: 132, share: 42 },
  { label: 'OR / receipt', value: 96, share: 31 },
  { label: 'Certificates', value: 64, share: 22 },
]

export const sdApplications: SdApplicationRow[] = [
  {
    id: 'a1',
    reference: 'TT-2026-0142',
    franchisee: 'Marites Santos',
    type: 'Renewal',
    status: 'approved',
    statusLabel: 'Approved',
    documents: 3,
    fee: 1500,
    total: 1500,
  },
  {
    id: 'a2',
    reference: 'TT-2026-0143',
    franchisee: 'Roberto Reyes',
    type: 'Transfer',
    status: 'pending',
    statusLabel: 'Pending',
    documents: 2,
    fee: 2750,
    total: 2900,
  },
  {
    id: 'a3',
    reference: 'TT-2026-0144',
    franchisee: 'Juan Dela Cruz',
    type: 'Change motor',
    status: 'pending',
    statusLabel: 'Pending',
    documents: 4,
    fee: 900,
    total: 900,
  },
  {
    id: 'a4',
    reference: 'TT-2026-0145',
    franchisee: 'Ana Villanueva',
    type: 'Renewal',
    status: 'rejected',
    statusLabel: 'Rejected',
    documents: 1,
    fee: 1500,
    total: 1650,
  },
  {
    id: 'a5',
    reference: 'TT-2026-0146',
    franchisee: 'Pedro Bautista',
    type: 'Renewal',
    status: 'approved',
    statusLabel: 'Approved',
    documents: 5,
    fee: 1500,
    total: 1500,
  },
  {
    id: 'a6',
    reference: 'TT-2026-0147',
    franchisee: 'Liza Mercado',
    type: 'Transfer',
    status: 'approved',
    statusLabel: 'Approved',
    documents: 3,
    fee: 2750,
    total: 2750,
  },
  {
    id: 'a7',
    reference: 'TT-2026-0148',
    franchisee: 'Ernesto Salazar',
    type: 'Change motor',
    status: 'cancelled',
    statusLabel: 'Cancelled',
    documents: 2,
    fee: 900,
    total: 900,
  },
  {
    id: 'a8',
    reference: 'TT-2026-0149',
    franchisee: 'Grace Domingo',
    type: 'Renewal',
    status: 'pending',
    statusLabel: 'Pending',
    documents: 2,
    fee: 1500,
    total: 1500,
  },
]

export const sdMoney = (value: number): string =>
  `₱${value.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
