import { levelAt, tideState } from './tides.js'
import { compass } from './weather.js'
import { moonPhase } from './moon.js'
import { HOUR, MIN, dateKey, localParts } from './time.js'

function nearest(rows, t, maxGap = 1.5 * HOUR) {
  if (!rows?.length) return null
  let best = null
  let bestGap = Infinity
  for (const r of rows) {
    const gap = Math.abs(r.t - t)
    if (gap < bestGap) {
      best = r
      bestGap = gap
    }
  }
  return bestGap <= maxGap ? best : null
}

/** DAWN / DAY / DUSK / NIGHT using real sunrise/sunset when we have it. */
export function lightAt(daily, t) {
  const day = daily?.find((d) => dateKey(d.sunrise) === dateKey(t))
  if (day) {
    if (t >= day.sunrise - 60 * MIN && t < day.sunrise + 90 * MIN) return 'DAWN'
    if (t >= day.sunset - 90 * MIN && t < day.sunset + 60 * MIN) return 'DUSK'
    if (t > day.sunrise && t < day.sunset) return 'DAY'
    return 'NIGHT'
  }
  const { hour } = localParts(t)
  if (hour >= 5 && hour < 8) return 'DAWN'
  if (hour >= 8 && hour < 17) return 'DAY'
  if (hour >= 17 && hour < 20) return 'DUSK'
  return 'NIGHT'
}

/**
 * Everything we know about conditions on the island at time t, as plain
 * numbers. Any field can be null if its source is unavailable.
 */
export function conditionsAt(data, t, { now = Date.now() } = {}) {
  // "Current" observations only count if they're actually recent; with stale
  // cached data (offline) fall back to the hourly forecast for time t.
  const fresh = (cur) => cur && Math.abs(t - now) < 30 * MIN && Math.abs(cur.t - t) < HOUR
  const tides = data?.tides
  const ts = tides ? tideState(tides.hilo, t) : null
  const level = tides ? levelAt(tides.curve, t) : null

  const wxCur = data?.weather?.current
  const seaCur = data?.marine?.current
  const wx = (fresh(wxCur) && wxCur) || nearest(data?.weather?.hourly, t)
  const sea = (fresh(seaCur) && seaCur.waterF != null && seaCur) || nearest(data?.marine?.hourly, t, 3 * HOUR)

  const { hour, month } = localParts(t)
  return {
    t,
    hour,
    month,
    tide: ts ? { ...ts, level } : null,
    level,
    airF: wx?.airF ?? null,
    windMph: wx?.windMph ?? null,
    windDeg: wx?.windDeg ?? null,
    windDir: compass(wx?.windDeg),
    gustMph: wx?.gustMph ?? null,
    precipPct: wx?.precipPct ?? null,
    code: wx?.code ?? null,
    waterF: sea?.waterF ?? null,
    waveFt: sea?.waveFt ?? null,
    periodS: sea?.periodS ?? null,
    light: lightAt(data?.weather?.daily, t),
    moon: moonPhase(t),
  }
}

/** Compact snapshot stored with each logged catch. */
export function snapshot(c) {
  if (!c) return null
  const r1 = (v) => (v == null ? null : Math.round(v * 10) / 10)
  return {
    tideDir: c.tide ? (c.tide.slack ? 'SLACK' : c.tide.direction) : null,
    tideLevel: r1(c.level),
    waterF: c.waterF == null ? null : Math.round(c.waterF),
    airF: c.airF == null ? null : Math.round(c.airF),
    windMph: c.windMph == null ? null : Math.round(c.windMph),
    windDir: c.windDir,
    waveFt: r1(c.waveFt),
    light: c.light,
    moon: c.moon?.name ?? null,
  }
}
