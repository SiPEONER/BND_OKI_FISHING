import { store, env } from './_lib/db.js'
import { handleAdmin } from './_lib/reports.js'

// Moderation. Requires header x-admin-key matching the ADMIN_KEY env var.
// GET  /api/admin                     last 30 days incl. hidden + flag counts
// POST /api/admin {action, id}        hide | unhide | delete

export function GET(request) {
  return handleAdmin(request, { store, env })
}

export function POST(request) {
  return handleAdmin(request, { store, env })
}
