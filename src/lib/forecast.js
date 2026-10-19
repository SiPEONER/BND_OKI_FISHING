import { conditionsAt } from './conditions.js'
import { recommend } from './recommend.js'
import { HOUR, dateKey } from './time.js'

export const WINDOW_THRESHOLD = 78
export const WINDOWS_PER_DAY = 3

/**
 * Hour-by-hour recommendation for the next `hours`, grouped into "best
 * windows": runs of consecutive hours where the top score clears the bar.
 */
export function hourlyOutlook(data, start, hours = 72) {
  const first = Math.ceil(start / HOUR) * HOUR
  const out = []
  for (let i = 0; i < hours; i++) {
    const t = first + i * HOUR
    const c = conditionsAt(data, t, { now: start })
    const rec = recommend(c)
    out.push({ t, c, rec })
  }
  return out
}

export function bestWindows(outlook, threshold = WINDOW_THRESHOLD) {
  const windows = []
  let cur = null
  for (const h of outlook) {
    const good = h.rec && h.rec.score >= threshold
    if (good && cur && cur.speciesId === h.rec.species.id) {
      cur.end = h.t + HOUR
      cur.peak = Math.max(cur.peak, h.rec.score)
    } else {
      if (cur) windows.push(cur)
      cur = good
        ? { start: h.t, end: h.t + HOUR, speciesId: h.rec.species.id, species: h.rec.species, peak: h.rec.score, zone: h.rec.zone }
        : null
    }
  }
  if (cur) windows.push(cur)
  return windows
}

/** The strongest few windows of a day, back in time order. */
export function topWindows(list, n = WINDOWS_PER_DAY) {
  return [...list].sort((a, b) => b.peak - a.peak).slice(0, n).sort((a, b) => a.start - b.start)
}

/** Group anything with a `t` (or `start`) by island calendar day. */
export function groupByDay(items, getT = (x) => x.t ?? x.start) {
  const days = new Map()
  for (const it of items) {
    const k = dateKey(getT(it))
    if (!days.has(k)) days.set(k, [])
    days.get(k).push(it)
  }
  return days
}
