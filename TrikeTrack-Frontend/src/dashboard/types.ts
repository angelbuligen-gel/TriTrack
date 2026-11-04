import type { ReactNode } from 'react'

export type ThemeMode = 'light' | 'dark'

export type Metric = {
  id: string
  label: string
  value: string
  /** Percentage change versus the previous period. */
  delta: number
  hint?: string
}

export type NavLeaf = {
  id: string
  label: string
  badge?: string
}

export type NavItem = {
  id: string
  label: string
  icon: ReactNode
  children?: NavLeaf[]
}

export type ApplicationStatus = 'Approved' | 'Pending' | 'Rejected'

export type ApplicationRow = {
  id: string
  reference: string
  franchisee: string
  type: 'Renewal' | 'Transfer' | 'Change Motor'
  status: ApplicationStatus
  amount: number
  submitted: string
}
