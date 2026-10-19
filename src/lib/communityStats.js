import { statusById } from '../data/community.js'

const HOUR = 3600 * 1000
export const FRESH_HOURS = 6

/** Reports from the last `hours` before `now`, newest first. */
export function recentReports(reports, now, hours = FRESH_HOURS) {
  return (reports ?? []).filter((r) => r.t >= now - hours * HOUR && r.t <= now + 5 * 60 * 1000).sort((a, b) => b.t - a.t)
}

const isGood = (r) => statusById(r.status)?.good

/**
 * Summary of what locals are seeing: counts, the zone with the most action,
 * and per-species "good report" counts for the matrix.
 */
export function summarize(reports, now, hours = FRESH_HOURS) {
  const recent = recentReports(reports, now, hours)
  const good = recent.filter(isGood)
  const goodBySpecies = new Map()
  const zones = new Map()
  for (const r of good) {
    goodBySpecies.set(r.speciesId, (goodBySpecies.get(r.speciesId) ?? 0) + 1)
  }
  for (const r of recent) {
    const z = zones.get(r.zoneId) ?? { zoneId: r.zoneId, count: 0, good: 0, species: new Map() }
    z.count++
    if (isGood(r)) {
      z.good++
      z.species.set(r.speciesId, (z.species.get(r.speciesId) ?? 0) + 1)
    }
    zones.set(r.zoneId, z)
  }
  const zoneList = [...zones.values()]
    .map((z) => ({ ...z, topSpecies: [...z.species.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null }))
    .sort((a, b) => b.good - a.good || b.count - a.count)
  return {
    count: recent.length,
    goodCount: good.length,
    latest: recent[0] ?? null,
    latestGood: good[0] ?? null,
    goodBySpecies,
    zones: zoneList,
    hotZone: zoneList.find((z) => z.good > 0 && z.zoneId !== 'X') ?? null,
  }
}

/** Zone with the most good reports for one species (ignores "elsewhere"). */
export function bestZoneFor(reports, speciesId, now, hours = FRESH_HOURS) {
  const counts = new Map()
  for (const r of recentReports(reports, now, hours)) {
    if (r.speciesId === speciesId && isGood(r) && r.zoneId !== 'X') counts.set(r.zoneId, (counts.get(r.zoneId) ?? 0) + 1)
  }
  const best = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]
  return best ? { zoneId: best[0], count: best[1] } : null
}
