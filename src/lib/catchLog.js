import { createStore, uid } from './store.js'
import { dateKey, fmtDateTime } from './time.js'
import { speciesById } from '../data/species.js'
import { zoneById } from '../data/zones.js'

// Catch shape:
// { id, t, speciesId, length, bait, rigId, zoneId, spotId, kept, notes,
//   cond: { tideDir, tideLevel, waterF, airF, windMph, windDir, waveFt, light, moon } }

export const catchStore = createStore('oki.catches.v1', [])
export const useCatches = () => catchStore.use()

const byNewest = (a, b) => b.t - a.t

export function addCatch(c) {
  const entry = { ...c, id: uid() }
  catchStore.set((list) => [entry, ...list].sort(byNewest))
  return entry
}

export function updateCatch(id, patch) {
  catchStore.set((list) => list.map((c) => (c.id === id ? { ...c, ...patch } : c)).sort(byNewest))
}

export function removeCatch(id) {
  catchStore.set((list) => list.filter((c) => c.id !== id))
}

/** Lengths of fish of a species already kept on the island day of t. */
export function keptToday(list, speciesId, t, excludeId) {
  const day = dateKey(t)
  return list
    .filter((c) => c.kept && c.speciesId === speciesId && c.id !== excludeId && dateKey(c.t) === day)
    .map((c) => c.length)
}

function isCatch(c) {
  return c && typeof c.id === 'string' && typeof c.t === 'number' && typeof c.speciesId === 'string'
}

/** Merge a backup file into the log. Returns how many new catches were added. */
export function importCatches(json) {
  const data = typeof json === 'string' ? JSON.parse(json) : json
  const incoming = (Array.isArray(data) ? data : data?.catches) ?? []
  const valid = incoming.filter(isCatch)
  if (!valid.length && incoming.length) throw new Error('NO VALID CATCHES IN FILE')
  let added = 0
  catchStore.set((list) => {
    const ids = new Set(list.map((c) => c.id))
    const fresh = valid.filter((c) => !ids.has(c.id))
    added = fresh.length
    return [...list, ...fresh].sort(byNewest)
  })
  return added
}

export function exportJSON(list) {
  return JSON.stringify({ app: 'oki-fishing', version: 1, exported: Date.now(), catches: list }, null, 2)
}

export function exportCSV(list) {
  const cols = [
    ['DATE', (c) => fmtDateTime(c.t)],
    ['SPECIES', (c) => speciesById(c.speciesId)?.name ?? c.speciesId],
    ['LENGTH_IN', (c) => c.length],
    ['KEPT', (c) => (c.kept ? 'YES' : 'NO')],
    ['BAIT', (c) => c.bait ?? ''],
    ['RIG', (c) => c.rigId ?? ''],
    ['ZONE', (c) => (c.zoneId ? zoneById(c.zoneId)?.name ?? c.zoneId : '')],
    ['TIDE', (c) => c.cond?.tideDir ?? ''],
    ['TIDE_FT', (c) => c.cond?.tideLevel ?? ''],
    ['WATER_F', (c) => c.cond?.waterF ?? ''],
    ['WIND', (c) => (c.cond?.windMph != null ? `${c.cond.windDir ?? ''} ${c.cond.windMph}` : '')],
    ['LIGHT', (c) => c.cond?.light ?? ''],
    ['NOTES', (c) => c.notes ?? ''],
  ]
  const esc = (v) => {
    const s = String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [cols.map(([h]) => h).join(','), ...list.map((c) => cols.map(([, f]) => esc(f(c))).join(','))].join('\n')
}

export function download(filename, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = Object.assign(document.createElement('a'), { href: url, download: filename })
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
