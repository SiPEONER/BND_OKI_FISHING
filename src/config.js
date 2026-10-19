// Central place for everything location-specific. Moving the app to another
// beach should only require editing this file and src/data/*.

export const SITE = {
  brand: 'BND',
  name: 'OKI FISHING',
  version: 'V2.0',
  tz: 'America/New_York',
  // Land point used for wind / air temperature.
  weather: { lat: 33.9166, lng: -78.1611 },
  // Just offshore so the marine model returns sea-surface temp + waves.
  marine: { lat: 33.89, lng: -78.14 },
  // NOAA CO-OPS tide prediction station.
  tideStation: { id: '8659182', name: 'OAK ISLAND, ATLANTIC OCEAN' },
  map: { center: [33.912, -78.155], zoom: 12 },
}

export const REFRESH_MS = 10 * 60 * 1000
