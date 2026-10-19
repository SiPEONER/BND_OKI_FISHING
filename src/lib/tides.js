import { HOUR, MIN, noaaBeginDate, parseGmtStamp } from './time.js'

const NOAA = 'https://api.tidesandcurrents.noaa.gov/api/prod/datagetter'

async function noaaPredictions({ stationId, begin, hours, interval, signal }) {
  const params = new URLSearchParams({
    product: 'predictions',
    application: 'oki_fishing_app',
    station: stationId,
    begin_date: noaaBeginDate(begin),
    range: String(hours),
    datum: 'MLLW',
    time_zone: 'gmt',
    units: 'english',
    interval,
    format: 'json',
  })
  const res = await fetch(`${NOAA}?${params}`, { signal })
  if (!res.ok) throw new Error(`NOAA HTTP ${res.status}`)
  const json = await res.json()
  if (json.error) throw new Error(`NOAA: ${json.error.message}`)
  if (!Array.isArray(json.predictions)) throw new Error('NOAA: no predictions')
  return json.predictions.map((p) => ({
    t: parseGmtStamp(p.t),
    v: parseFloat(p.v),
    ...(p.type ? { type: p.type } : {}),
  }))
}

/**
 * Fetch a tide curve (30-min points) and high/low list spanning
 * yesterday through the next few days, so "previous tide" and the
 * 3-day forecast always have data — even late in the evening.
 */
export async function fetchTides({ stationId, now = Date.now(), hoursBack = 24, hoursAhead = 96, signal }) {
  const begin = now - hoursBack * HOUR
  const hours = hoursBack + hoursAhead
  const [curve, hilo] = await Promise.all([
    noaaPredictions({ stationId, begin, hours, interval: '30', signal }),
    noaaPredictions({ stationId, begin, hours, interval: 'hilo', signal }),
  ])
  return { curve, hilo }
}

/** Linear interpolation of predicted water level (ft MLLW) at time t. */
export function levelAt(curve, t) {
  if (!curve?.length || t < curve[0].t || t > curve[curve.length - 1].t) return null
  let lo = 0
  let hi = curve.length - 1
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (curve[mid].t <= t) lo = mid
    else hi = mid
  }
  const a = curve[lo]
  const b = curve[hi]
  if (b.t === a.t) return a.v
  return a.v + ((b.v - a.v) * (t - a.t)) / (b.t - a.t)
}

export const SLACK_WINDOW_MIN = 25

/**
 * Tide state at time t from the high/low list.
 * direction: INCOMING (rising toward a high) or OUTGOING (falling toward a low)
 * slack: within SLACK_WINDOW_MIN of a turn
 * stage: 0..1 progress from the previous turn to the next one
 */
export function tideState(hilo, t) {
  if (!hilo?.length) return null
  const nextIdx = hilo.findIndex((p) => p.t > t)
  if (nextIdx <= 0) return null
  const prev = hilo[nextIdx - 1]
  const next = hilo[nextIdx]
  const sincePrev = t - prev.t
  const toNext = next.t - t
  return {
    direction: next.type === 'H' ? 'INCOMING' : 'OUTGOING',
    slack: Math.min(sincePrev, toNext) <= SLACK_WINDOW_MIN * MIN,
    stage: sincePrev / (next.t - prev.t),
    prev,
    next,
    toNext,
  }
}

/** The next n high/low turns after t. */
export function upcomingTurns(hilo, t, n = 4) {
  return (hilo ?? []).filter((p) => p.t > t).slice(0, n)
}
