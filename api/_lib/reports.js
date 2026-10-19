import { createHash, randomUUID } from 'node:crypto'
import { SPECIES, BAITS } from '../../src/data/species.js'
import { ZONES } from '../../src/data/zones.js'
import { REPORT_STATUSES, REPORT_ZONE_ELSEWHERE, MAX_FLAGS } from '../../src/data/community.js'

// Request handling for community reports, written against the Web
// Request/Response API and a pluggable store so it can be unit-tested.

const HOUR = 3600 * 1000
const DAY = 24 * HOUR
export const RATE_LIMIT_PER_HOUR = 6

const SPECIES_IDS = new Set(SPECIES.map((s) => s.id))
const ZONE_IDS = new Set([...ZONES.map((z) => z.id), REPORT_ZONE_ELSEWHERE])
const STATUS_IDS = new Set(REPORT_STATUSES.map((s) => s.id))
const BAIT_IDS = new Set(BAITS)
const LINKISH = /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|io|ly|co|me|app|gg|xyz)\b)/i

const json = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  })

class Bad extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

// Strips control characters on purpose.
// oxlint-disable-next-line no-control-regex
const clean = (s) => String(s).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim()
const num = (v, lo, hi) => (typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi ? v : null)

function deviceOf(request) {
  const d = request.headers.get('x-device') ?? ''
  return /^[A-Za-z0-9-]{8,64}$/.test(d) ? d : null
}

function ipHashOf(request, env) {
  const ip = (request.headers.get('x-forwarded-for') ?? '').split(',')[0].trim()
  if (!ip) return null
  return createHash('sha256').update(`${ip}|${env.HASH_SALT ?? 'oki-fishing'}`).digest('hex').slice(0, 24)
}

function crewOk(env, code) {
  const want = (env.CREW_CODE ?? '').trim().toUpperCase()
  if (!want) throw new Bad(503, 'POSTING IS NOT SET UP YET (NO CREW CODE)')
  return typeof code === 'string' && code.trim().toUpperCase() === want
}

function sanitizeCond(c) {
  if (!c || typeof c !== 'object') return null
  const s = (v, max = 16) => (typeof v === 'string' ? clean(v).slice(0, max) : null)
  return {
    tideDir: s(c.tideDir),
    tideLevel: num(c.tideLevel, -5, 15),
    waterF: num(c.waterF, 20, 110),
    airF: num(c.airF, -20, 130),
    windMph: num(c.windMph, 0, 150),
    windDir: s(c.windDir, 3),
    waveFt: num(c.waveFt, 0, 40),
    light: s(c.light, 6),
    moon: s(c.moon, 20),
  }
}

/** Validate an incoming report. Throws Bad(400) with a user-facing message. */
export function validateReport(input, now) {
  const r = input ?? {}
  if (!SPECIES_IDS.has(r.speciesId)) throw new Bad(400, 'PICK A SPECIES')
  if (!ZONE_IDS.has(r.zoneId)) throw new Bad(400, 'PICK A ZONE')
  if (!STATUS_IDS.has(r.status)) throw new Bad(400, 'PICK HOW IT IS GOING')
  const t = r.t == null ? now : num(r.t, now - 12 * HOUR, now + 5 * 60 * 1000)
  if (t == null) throw new Bad(400, 'REPORTS MUST BE FROM THE LAST 12 HOURS')

  let note = r.note == null || r.note === '' ? null : clean(r.note)
  if (note && note.length > 280) throw new Bad(400, 'NOTE IS TOO LONG (280 MAX)')
  if (note && LINKISH.test(note)) throw new Bad(400, 'NO LINKS IN NOTES')
  if (note === '') note = null

  let nickname = r.nickname == null || r.nickname === '' ? null : clean(r.nickname).toUpperCase()
  if (nickname && !/^[A-Z0-9 _.'-]{1,20}$/.test(nickname)) throw new Bad(400, 'NICKNAME: 20 LETTERS/NUMBERS MAX')
  if (nickname && LINKISH.test(nickname)) throw new Bad(400, 'NO LINKS IN NICKNAMES')

  const count = r.count == null ? null : num(r.count, 0, 200)
  if (r.count != null && (count == null || !Number.isInteger(count))) throw new Bad(400, 'COUNT MUST BE 0-200')
  const sizeIn = r.sizeIn == null ? null : num(r.sizeIn, 1, 99)
  if (r.sizeIn != null && sizeIn == null) throw new Bad(400, 'SIZE MUST BE 1-99 INCHES')
  const bait = r.bait == null ? null : BAIT_IDS.has(r.bait) ? r.bait : null

  return {
    t, speciesId: r.speciesId, zoneId: r.zoneId, status: r.status,
    count, sizeIn, bait, note, nickname, cond: sanitizeCond(r.cond),
  }
}

/** What the public API returns: no device ids or IP hashes. */
function publicView(r, device) {
  return {
    id: r.id, createdAt: r.createdAt, t: r.t, speciesId: r.speciesId, zoneId: r.zoneId,
    status: r.status, count: r.count, bait: r.bait, sizeIn: r.sizeIn, note: r.note,
    nickname: r.nickname, cond: r.cond, mine: !!device && r.device === device,
  }
}

export async function handleReports(request, { store, env = {}, now = Date.now() }) {
  try {
    if (!store) throw new Bad(503, 'COMMUNITY REPORTS ARE NOT SET UP YET')
    const device = deviceOf(request)

    if (request.method === 'GET') {
      const url = new URL(request.url)
      const days = Math.min(7, Math.max(1, Number(url.searchParams.get('days')) || 2))
      const rows = await store.list({ since: now - days * DAY, maxFlags: MAX_FLAGS })
      return json(200, { reports: rows.map((r) => publicView(r, device)), now })
    }

    if (request.method !== 'POST') throw new Bad(405, 'METHOD NOT ALLOWED')
    let body
    try {
      body = await request.json()
    } catch {
      throw new Bad(400, 'BAD REQUEST')
    }

    switch (body?.action) {
      case 'check':
        return json(200, { ok: crewOk(env, body.crew) })

      case 'create': {
        if (!device) throw new Bad(400, 'MISSING DEVICE ID')
        if (!crewOk(env, body.crew)) throw new Bad(403, 'WRONG CREW CODE')
        const report = validateReport(body.report, now)
        const ipHash = ipHashOf(request, env)
        const recent = await store.countRecent({ device, ipHash, since: now - HOUR })
        if (recent >= RATE_LIMIT_PER_HOUR) throw new Bad(429, 'EASY THERE: TOO MANY REPORTS THIS HOUR')
        const row = { ...report, id: randomUUID(), createdAt: now, device, ipHash }
        await store.insert(row)
        return json(201, { report: publicView(row, device) })
      }

      case 'flag': {
        if (!device) throw new Bad(400, 'MISSING DEVICE ID')
        const flags = await store.flag(String(body.id ?? ''), device)
        return json(200, { ok: flags != null })
      }

      case 'delete': {
        if (!device) throw new Bad(400, 'MISSING DEVICE ID')
        const ok = await store.remove(String(body.id ?? ''), device)
        if (!ok) throw new Bad(404, 'NOT FOUND OR NOT YOURS')
        return json(200, { ok })
      }

      default:
        throw new Bad(400, 'UNKNOWN ACTION')
    }
  } catch (e) {
    if (e instanceof Bad) return json(e.status, { error: e.message })
    console.error('[reports]', e)
    return json(500, { error: 'SERVER ERROR, TRY AGAIN' })
  }
}

export async function handleAdmin(request, { store, env = {}, now = Date.now() }) {
  try {
    const key = request.headers.get('x-admin-key') ?? ''
    if (!env.ADMIN_KEY || key !== env.ADMIN_KEY) throw new Bad(401, 'WRONG ADMIN KEY')
    if (!store) throw new Bad(503, 'COMMUNITY REPORTS ARE NOT SET UP YET')

    if (request.method === 'GET') {
      const rows = await store.list({ since: now - 30 * DAY, includeHidden: true, limit: 500 })
      return json(200, {
        reports: rows.map((r) => ({ ...publicView(r), flags: r.flags, hidden: r.hidden, device: r.device.slice(0, 6) })),
      })
    }
    if (request.method !== 'POST') throw new Bad(405, 'METHOD NOT ALLOWED')
    const body = await request.json().catch(() => ({}))
    const id = String(body.id ?? '')
    let ok
    if (body.action === 'hide') ok = await store.setHidden(id, true)
    else if (body.action === 'unhide') ok = await store.setHidden(id, false)
    else if (body.action === 'delete') ok = await store.remove(id)
    else throw new Bad(400, 'UNKNOWN ACTION')
    if (!ok) throw new Bad(404, 'NOT FOUND')
    return json(200, { ok })
  } catch (e) {
    if (e instanceof Bad) return json(e.status, { error: e.message })
    console.error('[admin]', e)
    return json(500, { error: 'SERVER ERROR' })
  }
}
