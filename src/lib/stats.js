import { speciesById } from '../data/species.js'

function tally(list, key) {
  const m = new Map()
  for (const c of list) {
    const k = key(c)
    if (k == null || k === '') continue
    m.set(k, (m.get(k) ?? 0) + 1)
  }
  return [...m.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count)
}

/** Summary numbers for the stats tab. Pure: give it the catch list. */
export function computeStats(list) {
  const bySpecies = tally(list, (c) => c.speciesId).map((r) => ({
    ...r,
    species: speciesById(r.label),
  }))

  const bests = new Map()
  for (const c of list) {
    const cur = bests.get(c.speciesId)
    if (!cur || c.length > cur.length) bests.set(c.speciesId, c)
  }

  return {
    total: list.length,
    kept: list.filter((c) => c.kept).length,
    released: list.filter((c) => !c.kept).length,
    bySpecies,
    personalBests: [...bests.values()].sort((a, b) => b.length - a.length),
    byTide: tally(list, (c) => c.cond?.tideDir),
    byBait: tally(list, (c) => c.bait),
    byLight: tally(list, (c) => c.cond?.light),
    byZone: tally(list, (c) => c.zoneId),
  }
}
