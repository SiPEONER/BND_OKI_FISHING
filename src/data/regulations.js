// NC recreational size & bag limits (coastal / joint waters + ocean).
// Source: NC Division of Marine Fisheries, recreational size & bag limits,
// effective Sept 2, 2026, plus the 2026 flounder season proclamation.
// Limits change by proclamation; check the source before keeping a fish.

export const REGS_META = {
  effective: '2026-09-02',
  checked: '2026-10-19',
  source: 'NC DIVISION OF MARINE FISHERIES',
  url: 'https://www.deq.nc.gov/about/divisions/marine-fisheries/rules-proclamations-and-size-and-bag-limits/recreational-size-and-bag-limits',
}

// Lengths in inches. measure: TL = total length, FL = fork length.
// min/max define the legal slot. `trophy` allows N fish above a size.
// `seasons` (MM-DD ranges, inclusive) means harvest is closed outside them.
export const REGULATIONS = {
  'red-drum': {
    min: 18, max: 27, measure: 'TL', bag: 1,
    notes: ['NO POSSESSION OVER 27"', 'UNLAWFUL TO GIG, SPEAR OR GAFF'],
  },
  'black-drum': {
    min: 14, max: 25, measure: 'TL', bag: 10,
    trophy: { over: 25, count: 1 },
    notes: ['1 PER DAY MAY BE OVER 25"'],
  },
  'speckled-trout': {
    min: 14, max: 20, measure: 'TL', bag: 3,
    trophy: { over: 26, count: 1 },
    notes: ['SLOT 14-20"', '1 PER DAY MAY BE OVER 26"', 'NOTHING 20-26"'],
  },
  flounder: {
    min: 15, measure: 'TL', bag: 1,
    seasons: [{ from: '09-01', to: '09-14' }],
    notes: ['2026 SEASON: SEP 1-14 ONLY', 'CLOSED OTHERWISE: RELEASE ALL FLOUNDER'],
  },
  spanish: {
    min: 12, measure: 'FL', bag: 15,
    notes: ['MEASURE FORK LENGTH', 'CHECK LATEST MACKEREL PROCLAMATION'],
  },
  'king-mackerel': {
    min: 24, measure: 'FL', bag: 3,
    notes: ['MEASURE FORK LENGTH', 'CHECK LATEST MACKEREL PROCLAMATION'],
  },
  bluefish: {
    measure: 'TL', bag: 5,
    notes: ['NO SIZE LIMIT', '5 PER DAY PRIVATE ANGLERS (7 FOR-HIRE)'],
  },
  sheepshead: { min: 14, measure: 'TL', bag: 5, notes: [] },
  'gray-trout': { min: 12, measure: 'TL', bag: 1, notes: ['AKA WEAKFISH'] },
  spot: { measure: 'TL', bag: 50, notes: ['NO SIZE LIMIT'] },
  croaker: { measure: 'TL', bag: 50, notes: ['NO SIZE LIMIT'] },
  whiting: { measure: 'TL', notes: ['NO STATE SIZE OR BAG LIMIT LISTED', 'AKA SEA MULLET / KINGFISH'] },
  pompano: { measure: 'FL', notes: ['NO STATE SIZE OR BAG LIMIT LISTED'] },
}
