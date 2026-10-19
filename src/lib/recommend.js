import { SPECIES } from '../data/species.js'
import { ZONES, zoneById } from '../data/zones.js'
import { rigById } from '../data/rigs.js'
import { isSeasonOpen } from './regs.js'

// The "matrix": a transparent points system. Every point comes with a reason
// so the dashboard can show WHY a fish is recommended. Tune the weights here.
export const WEIGHTS = {
  base: 40,
  tempIdeal: 20,
  tempOk: 5,
  tempOut: -35,
  outOfMonth: -25,
  tideMatch: 15, // full points mid-tide (water moving hardest), half near the turns
  tideMoving: 10,
  slack: -8,
  lowLight: 12, // dawn / dusk when the species likes it
  lightMatch: 6, // day / night when the species likes it
  lightMiss: -5,
  tooWindy: -20,
  closedSeason: -20,
  springTide: 3,
}

const LIGHT_TEXT = { DAWN: 'DAWN BITE', DAY: 'DAYTIME BITE', DUSK: 'DUSK BITE', NIGHT: 'NIGHT BITE' }

export function scoreSpecies(sp, c) {
  const p = sp.profile
  const W = WEIGHTS
  let score = W.base
  const reasons = []
  const add = (pts, text) => {
    score += pts
    if (text) reasons.push({ text, good: pts > 0 })
  }

  if (c.waterF != null) {
    const w = Math.round(c.waterF)
    const [min, lo, hi, max] = p.temp
    if (c.waterF < min) add(W.tempOut, `WATER ${w}° TOO COLD`)
    else if (c.waterF > max) add(W.tempOut, `WATER ${w}° TOO WARM`)
    else if (c.waterF >= lo && c.waterF <= hi) add(W.tempIdeal, `WATER ${w}° PRIME`)
    else add(W.tempOk, `WATER ${w}° OK`)
  }

  if (!p.months.includes(c.month)) add(W.outOfMonth, 'OFF SEASON')

  if (c.tide) {
    const midTide = c.tide.stage == null || (c.tide.stage >= 0.2 && c.tide.stage <= 0.8)
    const k = midTide ? 1 : 0.5
    if (c.tide.slack) add(W.slack, 'SLACK TIDE')
    else if (p.tide === 'MOVING') add(Math.round(W.tideMoving * k), midTide ? 'STRONG CURRENT' : 'MOVING WATER')
    else if (p.tide === c.tide.direction) add(Math.round(W.tideMatch * k), `${midTide ? 'MID ' : ''}${c.tide.direction} TIDE`.trim())
  }

  if (p.light.includes(c.light)) {
    add(c.light === 'DAWN' || c.light === 'DUSK' ? W.lowLight : W.lightMatch, LIGHT_TEXT[c.light])
  } else add(W.lightMiss)

  if (c.windMph != null && c.windMph > p.maxWind) add(W.tooWindy, `TOO WINDY (${Math.round(c.windMph)} MPH)`)

  if (!isSeasonOpen(sp.reg, c.t)) add(W.closedSeason, 'HARVEST CLOSED: C&R')

  if (c.moon?.springTide) add(W.springTide, `${c.moon.nearest} MOON TIDES`)

  return { species: sp, score: Math.max(0, Math.min(100, score)), reasons }
}

export function pickZone(sp, c) {
  const wind = c.windMph ?? 0
  const prefs = sp.profile.zones
  if (wind > 20) {
    const sheltered = prefs.map(zoneById).find((z) => z?.sheltered) ?? ZONES.find((z) => z.sheltered)
    return { zone: sheltered, why: 'BLOWN OUT: GO SHELTERED' }
  }
  if (sp.id === 'red-drum' && (c.windDir === 'E' || c.windDir === 'NE')) {
    return { zone: zoneById('A'), why: `${c.windDir} WIND PUSHES BAIT TO THE INLET` }
  }
  if (sp.id === 'flounder' && c.tide?.direction === 'OUTGOING') {
    return { zone: zoneById('D'), why: 'FALLING TIDE DRAINS THE MARSH' }
  }
  return { zone: zoneById(prefs[0]), why: null }
}

/** Ranked recommendation for conditions c, or null if there's nothing to go on. */
export function recommend(c, species = SPECIES) {
  if (!c) return null
  const ranked = species
    .filter((s) => s.profile)
    .map((s) => scoreSpecies(s, c))
    .sort((a, b) => b.score - a.score)
  const top = ranked[0]
  const { zone, why } = pickZone(top.species, c)
  // The original app's easter egg, preserved.
  const classified =
    top.species.id === 'red-drum' && c.tide?.direction === 'INCOMING' && c.windDir === 'NE' && (c.waterF ?? 0) > 68
  return {
    ...top,
    ranked,
    zone,
    zoneWhy: why,
    classified,
    rig: rigById(top.species.profile.rig),
    bait: top.species.profile.bait,
  }
}

export function biteLabel(score) {
  if (score >= 85) return 'ON FIRE'
  if (score >= 75) return 'GOOD'
  if (score >= 60) return 'FAIR'
  return 'SLOW'
}
