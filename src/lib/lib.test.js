import { describe, expect, it, beforeEach } from 'vitest'
import { levelAt, tideState, upcomingTurns } from './tides.js'
import { dateKey, fmtTime, fromLocalInput, localParts, parseGmtStamp, toLocalInput } from './time.js'
import { checkCatch, isSeasonOpen, sizeText } from './regs.js'
import { REGULATIONS } from '../data/regulations.js'
import { recommend, scoreSpecies } from './recommend.js'
import { speciesById, SPECIES, QUICK_LOG_IDS } from '../data/species.js'
import { rigById } from '../data/rigs.js'
import { zoneById } from '../data/zones.js'
import { computeStats } from './stats.js'
import { conditionsAt, lightAt } from './conditions.js'
import { moonPhase } from './moon.js'
import { compass } from './weather.js'
import { bestWindows } from './forecast.js'

const H = 3600e3
// 2026-10-19 12:00 EDT = 16:00Z
const NOON = Date.UTC(2026, 9, 19, 16, 0)
const hilo = [
  { t: NOON - 5 * H, v: 0.3, type: 'L' },
  { t: NOON + 1 * H, v: 4.6, type: 'H' },
  { t: NOON + 7 * H, v: 0.1, type: 'L' },
  { t: NOON + 13 * H, v: 4.9, type: 'H' },
]
const curve = [
  { t: NOON, v: 4.0 },
  { t: NOON + 0.5 * H, v: 4.4 },
]

describe('time (island timezone, independent of device TZ)', () => {
  it('parses NOAA GMT stamps', () => {
    expect(parseGmtStamp('2026-10-19 16:00')).toBe(NOON)
  })
  it('reports island hour and date', () => {
    expect(localParts(NOON).hour).toBe(12)
    expect(dateKey(Date.UTC(2026, 9, 20, 2, 0))).toBe('2026-10-19') // 10pm EDT
    expect(fmtTime(NOON)).toBe('12:00 PM')
  })
  it('round-trips datetime-local inputs as island time, across DST', () => {
    expect(fromLocalInput('2026-10-19T12:00')).toBe(NOON)
    expect(toLocalInput(NOON)).toBe('2026-10-19T12:00')
    const winter = fromLocalInput('2026-12-01T08:30')
    expect(winter).toBe(Date.UTC(2026, 11, 1, 13, 30))
  })
})

describe('tides', () => {
  it('interpolates level', () => {
    expect(levelAt(curve, NOON + 0.25 * H)).toBeCloseTo(4.2)
    expect(levelAt(curve, NOON - H)).toBeNull()
  })
  it('knows direction, slack and next turn', () => {
    const s = tideState(hilo, NOON)
    expect(s.direction).toBe('INCOMING')
    expect(s.next.type).toBe('H')
    expect(s.slack).toBe(false)
    expect(tideState(hilo, NOON + 1 * H + 10 * 60e3).slack).toBe(true)
    expect(tideState(hilo, NOON + 3 * H).direction).toBe('OUTGOING')
  })
  it('finds the next tide even late in the evening (old SLACK bug)', () => {
    // 11pm EDT: the next turn is "tomorrow" but still in the list
    const late = NOON + 11 * H
    expect(tideState(hilo, late).direction).toBe('INCOMING')
    expect(upcomingTurns(hilo, late, 2)).toHaveLength(1)
  })
  it('returns null outside data', () => {
    expect(tideState(hilo, NOON + 20 * H)).toBeNull()
    expect(tideState([], NOON)).toBeNull()
  })
})

describe('regulations', () => {
  const at = Date.UTC(2026, 9, 19, 16)
  it('formats sizes', () => {
    expect(sizeText(REGULATIONS['red-drum'])).toBe('18"-27" SLOT')
    expect(sizeText(REGULATIONS.flounder)).toBe('15" MIN')
    expect(sizeText(REGULATIONS.bluefish)).toBe('NO LIMIT')
  })
  it('red drum slot', () => {
    const r = REGULATIONS['red-drum']
    expect(checkCatch(r, 17, { t: at }).verdict).toBe('UNDERSIZE')
    expect(checkCatch(r, 22, { t: at }).verdict).toBe('LEGAL')
    expect(checkCatch(r, 28, { t: at }).verdict).toBe('OVER SLOT')
    expect(checkCatch(r, 22, { t: at, keptToday: [20] }).verdict).toBe('BAG FULL')
  })
  it('speckled trout slot with one trophy over 26', () => {
    const r = REGULATIONS['speckled-trout']
    expect(checkCatch(r, 16, { t: at }).ok).toBe(true)
    expect(checkCatch(r, 23, { t: at }).verdict).toBe('OVER SLOT')
    expect(checkCatch(r, 27, { t: at }).ok).toBe(true)
    expect(checkCatch(r, 28, { t: at, keptToday: [27] }).verdict).toBe('TROPHY USED')
  })
  it('flounder season Sep 1-14 only', () => {
    const r = REGULATIONS.flounder
    expect(isSeasonOpen(r, Date.UTC(2026, 8, 5, 16))).toBe(true)
    expect(isSeasonOpen(r, Date.UTC(2026, 8, 15, 16))).toBe(false)
    expect(checkCatch(r, 18, { t: at }).verdict).toBe('SEASON CLOSED')
  })
  it('no-limit species', () => {
    expect(checkCatch(REGULATIONS.whiting, 10, { t: at }).verdict).toBe('NO LIMIT')
    expect(checkCatch(null, 10).ok).toBeNull()
  })
})

describe('catalog integrity', () => {
  it('every profiled species points at a real rig and real zones', () => {
    for (const s of SPECIES.filter((x) => x.profile)) {
      expect(rigById(s.profile.rig), s.id).toBeTruthy()
      for (const z of s.profile.zones) expect(zoneById(z), `${s.id} zone ${z}`).toBeTruthy()
    }
  })
  it('quick-log ids exist and every regulation maps to a species', () => {
    for (const id of QUICK_LOG_IDS) expect(speciesById(id), id).toBeTruthy()
    for (const id of Object.keys(REGULATIONS)) expect(speciesById(id), id).toBeTruthy()
  })
})

const baseCond = {
  t: NOON, hour: 12, month: 10, waterF: 70, windMph: 8, windDir: 'NE', light: 'DAY',
  tide: { direction: 'INCOMING', slack: false }, moon: { springTide: false },
}

describe('recommendation matrix', () => {
  it('scores with reasons', () => {
    const r = scoreSpecies(speciesById('red-drum'), { ...baseCond, light: 'DUSK' })
    expect(r.reasons.map((x) => x.text)).toEqual(expect.arrayContaining(['WATER 70° PRIME', 'MID INCOMING TIDE', 'DUSK BITE']))
    expect(r.score).toBeGreaterThan(80)
  })
  it('penalises cold water and closed seasons', () => {
    const cold = scoreSpecies(speciesById('spanish'), { ...baseCond, waterF: 55 })
    expect(cold.reasons[0].text).toBe('WATER 55° TOO COLD')
    const fl = scoreSpecies(speciesById('flounder'), baseCond)
    expect(fl.reasons.some((x) => x.text.includes('C&R'))).toBe(true)
  })
  it('sends you somewhere sheltered when blown out', () => {
    const rec = recommend({ ...baseCond, windMph: 28 })
    expect(rec.zone.sheltered).toBe(true)
  })
  it('keeps the ZONE X easter egg', () => {
    const rec = recommend({ ...baseCond, light: 'NIGHT', waterF: 72, month: 10 })
    expect(rec.species.id).toBe('red-drum')
    expect(rec.classified).toBe(true)
  })
  it('still works with no water temp or tide', () => {
    const rec = recommend({ ...baseCond, waterF: null, tide: null })
    expect(rec.species).toBeTruthy()
  })
})

describe('conditions', () => {
  const data = {
    tides: { hilo, curve },
    weather: {
      current: { t: NOON, airF: 74, windMph: 12, windDeg: 45, gustMph: 18, code: 1 },
      hourly: [{ t: NOON + H, airF: 75, windMph: 14, windDeg: 90, gustMph: 20, precipPct: 10, code: 2 }],
      daily: [{ t: NOON, sunrise: Date.UTC(2026, 9, 19, 11, 20), sunset: Date.UTC(2026, 9, 19, 22, 30) }],
    },
    marine: { current: { t: NOON, waterF: 71.4, waveFt: 2.1, periodS: 7 }, hourly: [] },
  }
  it('builds a numeric snapshot', () => {
    const c = conditionsAt(data, NOON, { now: NOON })
    expect(c.windDir).toBe('NE')
    expect(c.waterF).toBeCloseTo(71.4)
    expect(c.tide.direction).toBe('INCOMING')
    expect(c.level).toBeCloseTo(4.0)
    expect(c.light).toBe('DAY')
  })
  it('uses hourly forecast for future times', () => {
    const c = conditionsAt(data, NOON + H, { now: NOON })
    expect(c.windDir).toBe('E')
  })
  it('light uses real sun times', () => {
    expect(lightAt(data.weather.daily, Date.UTC(2026, 9, 19, 11, 30))).toBe('DAWN')
    expect(lightAt(data.weather.daily, Date.UTC(2026, 9, 19, 22, 0))).toBe('DUSK')
    expect(lightAt(data.weather.daily, Date.UTC(2026, 9, 20, 3, 0))).toBe('NIGHT')
  })
})

describe('misc', () => {
  it('compass', () => {
    expect(compass(0)).toBe('N')
    expect(compass(350)).toBe('N')
    expect(compass(-45)).toBe('NW')
    expect(compass(null)).toBeNull()
  })
  it('moon phase near a known full moon (2026-10-26)', () => {
    expect(moonPhase(Date.UTC(2026, 9, 26, 12)).name).toBe('FULL MOON')
  })
  it('stats', () => {
    const s = computeStats([
      { id: '1', t: 1, speciesId: 'red-drum', length: 22, kept: true, bait: 'CUT', cond: { tideDir: 'INCOMING' } },
      { id: '2', t: 2, speciesId: 'red-drum', length: 30, kept: false, bait: 'CUT', cond: { tideDir: 'INCOMING' } },
      { id: '3', t: 3, speciesId: 'whiting', length: 12, kept: true, bait: 'SHRIMP', cond: { tideDir: 'OUTGOING' } },
    ])
    expect(s.total).toBe(3)
    expect(s.kept).toBe(2)
    expect(s.personalBests[0].length).toBe(30)
    expect(s.byTide[0]).toEqual({ label: 'INCOMING', count: 2 })
  })
  it('groups best windows', () => {
    const sp = speciesById('red-drum')
    const mk = (i, score, s = sp) => ({ t: NOON + i * H, rec: { score, species: s, zone: null } })
    const w = bestWindows([mk(0, 80), mk(1, 85), mk(2, 50), mk(3, 80, speciesById('whiting'))])
    expect(w).toHaveLength(2)
    expect(w[0].end - w[0].start).toBe(2 * H)
    expect(w[0].peak).toBe(85)
  })
})

describe('catch log storage', () => {
  beforeEach(() => {
    const mem = new Map()
    globalThis.localStorage = {
      getItem: (k) => (mem.has(k) ? mem.get(k) : null),
      setItem: (k, v) => mem.set(k, String(v)),
      removeItem: (k) => mem.delete(k),
    }
  })
  it('adds, counts kept today, exports and re-imports without duplicates', async () => {
    const log = await import('./catchLog.js')
    log.catchStore.set([])
    const a = log.addCatch({ t: NOON, speciesId: 'red-drum', length: 20, kept: true, notes: 'a "quoted", note' })
    log.addCatch({ t: NOON + H, speciesId: 'red-drum', length: 24, kept: false })
    const list = log.catchStore.get()
    expect(list).toHaveLength(2)
    expect(log.keptToday(list, 'red-drum', NOON)).toEqual([20])
    expect(log.exportCSV(list)).toContain('"a ""quoted"", note"')
    const json = log.exportJSON(list)
    expect(log.importCatches(json)).toBe(0)
    log.removeCatch(a.id)
    expect(log.importCatches(json)).toBe(1)
    expect(() => log.importCatches('[{"nope":1}]')).toThrow()
  })
})
