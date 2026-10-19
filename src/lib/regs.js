import { localParts } from './time.js'

const mmdd = (t) => {
  const { month, day } = localParts(t)
  return `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/** True when harvest is open on the island date of t (always true without seasons). */
export function isSeasonOpen(reg, t = Date.now()) {
  if (!reg?.seasons?.length) return true
  const d = mmdd(t)
  return reg.seasons.some(({ from, to }) => (from <= to ? d >= from && d <= to : d >= from || d <= to))
}

export function sizeText(reg) {
  if (!reg) return 'NO RULE ON FILE'
  if (reg.min && reg.max) return `${reg.min}"-${reg.max}" SLOT`
  if (reg.min) return `${reg.min}" MIN`
  if (reg.max) return `${reg.max}" MAX`
  return 'NO LIMIT'
}

export const bagText = (reg) => (reg?.bag ? `${reg.bag} PER DAY` : 'NO LIMIT')

/**
 * Can I keep this fish?
 * keptToday: lengths of fish of this species already kept today.
 * Returns { verdict, ok, detail } where ok means it's legal to keep.
 */
export function checkCatch(reg, length, { t = Date.now(), keptToday = [] } = {}) {
  if (!reg) return { verdict: 'CHECK REGS', ok: null, detail: 'NO NC RULE ON FILE FOR THIS FISH' }
  if (!isSeasonOpen(reg, t)) {
    return { verdict: 'SEASON CLOSED', ok: false, detail: 'RELEASE IT: HARVEST SEASON IS CLOSED' }
  }
  const m = reg.measure === 'FL' ? 'FORK LENGTH' : 'TOTAL LENGTH'
  if (reg.min && length < reg.min) {
    return { verdict: 'UNDERSIZE', ok: false, detail: `MIN ${reg.min}" ${m}` }
  }
  if (reg.max && length > reg.max) {
    const trophy = reg.trophy && length > reg.trophy.over
    if (!trophy) {
      return {
        verdict: 'OVER SLOT', ok: false,
        detail: reg.trophy
          ? `SLOT ${reg.min}-${reg.max}" · ONLY ${reg.trophy.count} OVER ${reg.trophy.over}" ALLOWED`
          : `MAX ${reg.max}" ${m}`,
      }
    }
    const trophiesKept = keptToday.filter((l) => l > reg.trophy.over).length
    if (trophiesKept >= reg.trophy.count) {
      return { verdict: 'TROPHY USED', ok: false, detail: `ALREADY KEPT ${trophiesKept} OVER ${reg.trophy.over}" TODAY` }
    }
  }
  if (reg.bag && keptToday.length >= reg.bag) {
    return { verdict: 'BAG FULL', ok: false, detail: `${keptToday.length} OF ${reg.bag} ALREADY KEPT TODAY` }
  }
  const left = reg.bag ? ` · ${reg.bag - keptToday.length - 1} MORE ALLOWED TODAY` : ''
  if (!reg.min && !reg.max && !reg.bag) return { verdict: 'NO LIMIT', ok: true, detail: 'NO SIZE OR BAG LIMIT' }
  return { verdict: 'LEGAL', ok: true, detail: `${sizeText(reg)}${left}` }
}
