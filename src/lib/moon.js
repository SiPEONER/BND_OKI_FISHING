// Moon phase from a reference new moon; accurate to within a few hours,
// plenty for "big tides this week".

const SYNODIC_DAYS = 29.530588853
const REF_NEW_MOON = Date.UTC(2000, 0, 6, 18, 14)
const DAY = 86400000

const PHASES = [
  [0.0339, 'NEW MOON'],
  [0.216, 'WAXING CRESCENT'],
  [0.284, 'FIRST QUARTER'],
  [0.466, 'WAXING GIBBOUS'],
  [0.534, 'FULL MOON'],
  [0.716, 'WANING GIBBOUS'],
  [0.784, 'LAST QUARTER'],
  [0.966, 'WANING CRESCENT'],
  [1.01, 'NEW MOON'],
]

export function moonPhase(t) {
  const age = ((((t - REF_NEW_MOON) / DAY) % SYNODIC_DAYS) + SYNODIC_DAYS) % SYNODIC_DAYS
  const fraction = age / SYNODIC_DAYS
  const illumination = (1 - Math.cos(2 * Math.PI * fraction)) / 2
  const name = PHASES.find(([limit]) => fraction < limit)[1]
  // Days to the nearest new or full moon: spring tides run bigger then.
  const toNew = Math.min(age, SYNODIC_DAYS - age)
  const toFull = Math.abs(age - SYNODIC_DAYS / 2)
  return {
    name,
    fraction,
    illumination,
    springTide: Math.min(toNew, toFull) <= 2,
    nearest: toNew < toFull ? 'NEW' : 'FULL',
  }
}
