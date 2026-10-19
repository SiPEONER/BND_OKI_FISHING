import { REGULATIONS } from './regulations.js'

// THE single species catalog. Regulations, catch logging, the rig guide and the
// recommendation engine all read from here, so names can never drift apart.
//
// `profile` drives the recommendation engine (omit it to keep a species
// loggable but never recommended):
//   temp:   [min, idealLow, idealHigh, max] water temp °F
//   months: months (1-12) when the fish are reliably around
//   tide:   'INCOMING' | 'OUTGOING' | 'MOVING' (either, just not slack)
//   light:  times of day it bites best: DAWN, DAY, DUSK, NIGHT
//   zones:  preferred zone ids, best first
//   maxWind: above this (mph) the spot gets unfishable for this species
//   rig / bait: what to throw

const SPECIES_BASE = [
  {
    id: 'red-drum', name: 'RED DRUM', short: 'RED DRUM', aliases: ['REDFISH', 'PUPPY DRUM'],
    profile: {
      temp: [55, 65, 80, 88], months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      tide: 'INCOMING', light: ['DAWN', 'DUSK', 'NIGHT'], zones: ['A', 'C', 'D'], maxWind: 22,
      rig: 'carolina', bait: 'CUT MULLET / LIVE FINGER MULLET',
    },
  },
  {
    id: 'black-drum', name: 'BLACK DRUM', short: 'BLK DRUM', aliases: [],
    profile: {
      temp: [50, 58, 75, 84], months: [1, 2, 3, 4, 5, 10, 11, 12],
      tide: 'MOVING', light: ['DAY', 'DUSK', 'NIGHT'], zones: ['A', 'B', 'D'], maxWind: 20,
      rig: 'double-drop', bait: 'FRESH SHRIMP / SAND FLEAS',
    },
  },
  {
    id: 'speckled-trout', name: 'SPECKLED TROUT', short: 'TROUT', aliases: ['SPOTTED SEATROUT', 'SPECK'],
    profile: {
      temp: [50, 56, 72, 82], months: [3, 4, 5, 9, 10, 11, 12],
      tide: 'OUTGOING', light: ['DAWN', 'DUSK'], zones: ['D', 'A'], maxWind: 18,
      rig: 'popping-cork', bait: 'LIVE SHRIMP / MIRRODINE / PADDLE TAIL',
    },
  },
  {
    id: 'flounder', name: 'FLOUNDER', short: 'FLOUNDER', aliases: ['SOUTHERN FLOUNDER', 'FLATFISH'],
    profile: {
      temp: [60, 66, 80, 88], months: [5, 6, 7, 8, 9, 10],
      tide: 'OUTGOING', light: ['DAWN', 'DAY', 'DUSK'], zones: ['D', 'A'], maxWind: 20,
      rig: 'jig', bait: 'GULP! 3" MULLET / LIVE MUD MINNOW',
    },
  },
  {
    id: 'spanish', name: 'SPANISH MACKEREL', short: 'SPANISH', aliases: [],
    profile: {
      temp: [67, 72, 84, 90], months: [4, 5, 6, 7, 8, 9, 10],
      tide: 'INCOMING', light: ['DAWN', 'DUSK'], zones: ['B', 'A'], maxWind: 15,
      rig: 'spoon', bait: 'CASTING SPOON / GOTCHA PLUG',
    },
  },
  {
    id: 'bluefish', name: 'BLUEFISH', short: 'BLUES', aliases: ['TAILOR'],
    profile: {
      temp: [58, 64, 78, 86], months: [3, 4, 5, 6, 9, 10, 11, 12],
      tide: 'INCOMING', light: ['DAWN', 'DUSK', 'DAY'], zones: ['B', 'A', 'C'], maxWind: 18,
      rig: 'spoon', bait: 'GOTCHA PLUG / CUT MULLET',
    },
  },
  {
    id: 'whiting', name: 'WHITING', short: 'WHITING', aliases: ['SEA MULLET', 'KINGFISH'],
    profile: {
      temp: [52, 58, 76, 84], months: [3, 4, 5, 6, 9, 10, 11, 12],
      tide: 'OUTGOING', light: ['DAY'], zones: ['C', 'B'], maxWind: 18,
      rig: 'double-drop', bait: 'FRESH SHRIMP / FISHBITES SAND FLEA',
    },
  },
  {
    id: 'pompano', name: 'POMPANO', short: 'POMPANO', aliases: ['FLORIDA POMPANO'],
    profile: {
      temp: [68, 72, 82, 88], months: [5, 6, 7, 8, 9, 10],
      tide: 'INCOMING', light: ['DAY'], zones: ['C'], maxWind: 15,
      rig: 'double-drop', bait: 'LIVE SAND FLEAS',
    },
  },
  {
    id: 'sheepshead', name: 'SHEEPSHEAD', short: 'SHEEPSHD', aliases: ['CONVICT FISH'],
    profile: {
      temp: [58, 64, 80, 88], months: [3, 4, 5, 6, 7, 8, 9, 10, 11],
      tide: 'MOVING', light: ['DAY'], zones: ['B', 'D'], maxWind: 25,
      rig: 'carolina', bait: 'FIDDLER CRABS / SAND FLEAS',
    },
  },
  {
    id: 'spot', name: 'SPOT', short: 'SPOT', aliases: [],
    profile: {
      temp: [55, 62, 76, 84], months: [8, 9, 10, 11],
      tide: 'MOVING', light: ['DAY', 'DUSK'], zones: ['B', 'D'], maxWind: 25,
      rig: 'double-drop', bait: 'BLOODWORMS / FISHBITES',
    },
  },
  {
    id: 'croaker', name: 'CROAKER', short: 'CROAKER', aliases: ['HARDHEAD'],
    profile: {
      temp: [60, 66, 82, 88], months: [4, 5, 6, 7, 8, 9, 10],
      tide: 'MOVING', light: ['DAY', 'DUSK', 'NIGHT'], zones: ['B', 'D'], maxWind: 25,
      rig: 'double-drop', bait: 'FRESH SHRIMP',
    },
  },
  { id: 'king-mackerel', name: 'KING MACKEREL', short: 'KING', aliases: ['KINGFISH (PIER)'] },
  { id: 'gray-trout', name: 'GRAY TROUT', short: 'GRAY TRT', aliases: ['WEAKFISH'] },
  { id: 'other', name: 'OTHER', short: 'OTHER', aliases: [] },
]

export const SPECIES = SPECIES_BASE.map((s) => ({ ...s, reg: REGULATIONS[s.id] ?? null }))

export const speciesById = (id) => SPECIES.find((s) => s.id === id)

// Quick-pick grid on the log screen: the fish people actually catch here.
export const QUICK_LOG_IDS = [
  'red-drum', 'flounder', 'speckled-trout', 'spanish',
  'whiting', 'bluefish', 'black-drum', 'pompano',
  'sheepshead', 'spot', 'croaker', 'other',
]

export const BAITS = ['LIVE', 'CUT', 'SHRIMP', 'FLEA', 'ARTIF', 'OTHER']
