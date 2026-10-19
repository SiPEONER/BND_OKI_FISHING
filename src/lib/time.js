import { SITE } from '../config.js'

// All times are epoch milliseconds internally. Display + "what hour is it on
// the island" always use the island's timezone, never the phone's.

const fmtCache = new Map()
function fmt(opts) {
  const key = JSON.stringify(opts)
  if (!fmtCache.has(key)) {
    fmtCache.set(key, new Intl.DateTimeFormat('en-US', { timeZone: SITE.tz, ...opts }))
  }
  return fmtCache.get(key)
}

export const HOUR = 3600 * 1000
export const MIN = 60 * 1000
export const DAY = 24 * HOUR

/** { year, month (1-12), day, hour (0-23), minute, weekday } on the island. */
export function localParts(t) {
  const out = {}
  for (const p of fmt({
    year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric', weekday: 'short', hourCycle: 'h23',
  }).formatToParts(new Date(t))) {
    out[p.type] = p.value
  }
  return {
    year: +out.year, month: +out.month, day: +out.day,
    hour: +out.hour % 24, minute: +out.minute, weekday: out.weekday.toUpperCase(),
  }
}

/** 'YYYY-MM-DD' of the island calendar day containing t. */
export function dateKey(t) {
  const { year, month, day } = localParts(t)
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/** '3:42 PM' */
export const fmtTime = (t) => fmt({ hour: 'numeric', minute: '2-digit' }).format(new Date(t))
/** '3PM' */
export const fmtHour = (t) => fmt({ hour: 'numeric' }).format(new Date(t)).replace(' ', '')
/** 'MON 10/19' */
export function fmtDay(t) {
  const p = localParts(t)
  return `${p.weekday} ${p.month}/${p.day}`
}
/** 'MON 10/19 · 3:42 PM' */
export const fmtDateTime = (t) => `${fmtDay(t)} · ${fmtTime(t)}`

export function fmtAgo(t, now = Date.now()) {
  const m = Math.round((now - t) / MIN)
  if (m < 1) return 'JUST NOW'
  if (m < 60) return `${m} MIN AGO`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} HR AGO`
  return `${Math.round(h / 24)} DAYS AGO`
}

export function fmtDuration(ms) {
  const m = Math.max(0, Math.round(ms / MIN))
  const h = Math.floor(m / 60)
  return h ? `${h}H ${String(m % 60).padStart(2, '0')}M` : `${m}M`
}

/** NOAA 'YYYY-MM-DD HH:MM' (requested in GMT) -> epoch ms */
export function parseGmtStamp(s) {
  return Date.parse(`${s.replace(' ', 'T')}:00Z`)
}

/** epoch ms -> NOAA begin_date 'yyyyMMdd HH:mm' in GMT */
export function noaaBeginDate(t) {
  const d = new Date(t)
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`
}

/** Value for <input type="datetime-local"> in island time. */
export function toLocalInput(t) {
  const p = localParts(t)
  const z = (n) => String(n).padStart(2, '0')
  return `${p.year}-${z(p.month)}-${z(p.day)}T${z(p.hour)}:${z(p.minute)}`
}

/** Parse <input type="datetime-local"> value as island time -> epoch ms. */
export function fromLocalInput(value) {
  const [d, hm] = value.split('T')
  const [y, mo, da] = d.split('-').map(Number)
  const [h, mi] = hm.split(':').map(Number)
  // Guess as UTC, then correct by the island's offset at that moment (twice
  // handles DST boundaries).
  let t = Date.UTC(y, mo - 1, da, h, mi)
  for (let i = 0; i < 2; i++) {
    const p = localParts(t)
    const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute)
    t += Date.UTC(y, mo - 1, da, h, mi) - asUtc
  }
  return t
}
