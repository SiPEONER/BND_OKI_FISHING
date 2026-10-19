import { store, env } from './_lib/db.js'
import { handleReports } from './_lib/reports.js'

// GET  /api/reports?days=2          recent public reports
// POST /api/reports {action, ...}   check | create | flag | delete

export function GET(request) {
  return handleReports(request, { store, env })
}

export function POST(request) {
  return handleReports(request, { store, env })
}
