// Fishing zones shown on the map and used by the recommendation engine.
// Coordinates are approximate; nudge them here if a pin sits off your spot.
// `sheltered` zones are where the engine sends you when the wind is up.

export const ZONES = [
  {
    id: 'A', name: 'THE POINT', area: 'WEST END / INLET',
    lat: 33.9178, lng: -78.2365,
    blurb: 'LOCKWOOD FOLLY INLET MOUTH. MOVING WATER, BAIT POURS THROUGH ON THE TIDE.',
  },
  {
    id: 'B', name: 'OCEAN CREST PIER', area: '14TH ST E / PELAGICS',
    lat: 33.9124, lng: -78.1447,
    blurb: 'DEEP WATER OFF THE END FOR SPANISH, BLUES AND KINGS. PILINGS HOLD SHEEPSHEAD.',
  },
  {
    id: 'C', name: 'MID-ISLAND SURF', area: '46TH ST E / TROUGH',
    lat: 33.9103, lng: -78.1180,
    blurb: 'READ THE TROUGHS AND CUTS AT LOW TIDE, FISH THEM ON THE RISE.',
  },
  {
    id: 'D', name: 'DAVIS CANAL', area: 'SE 40TH ST / MARSH',
    lat: 33.9152, lng: -78.1215, sheltered: true,
    blurb: 'PROTECTED BACKWATER. THE PLAY WHEN THE OCEAN IS BLOWN OUT.',
  },
]

export const zoneById = (id) => ZONES.find((z) => z.id === id)
export const zoneLabel = (z) => (z ? `ZONE ${z.id} :: ${z.name}` : '')
