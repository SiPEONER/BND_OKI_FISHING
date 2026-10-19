// Shared between the app and the /api functions.
import { zoneById } from './zones.js'

export const REPORT_STATUSES = [
  { id: 'CATCHING', label: 'CATCHING', good: true },
  { id: 'BITES', label: 'BITES / SHORT STRIKES', good: true },
  { id: 'SLOW', label: 'SLOW', good: false },
  { id: 'SKUNKED', label: 'SKUNKED', good: false },
]

export const REPORT_ZONE_ELSEWHERE = 'X'

// A report flagged by this many different phones disappears from the feed.
export const MAX_FLAGS = 3

export const statusById = (id) => REPORT_STATUSES.find((s) => s.id === id)

export const reportZoneName = (id) =>
  id === REPORT_ZONE_ELSEWHERE ? 'ELSEWHERE ON THE ISLAND' : `ZONE ${id} :: ${zoneById(id)?.name ?? ''}`
