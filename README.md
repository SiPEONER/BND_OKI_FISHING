# BND :: OKI Fishing

A fast, installable fishing app for Oak Island, NC: live tide state, real sea
temperature and surf, a "matrix" that recommends what to target, where, and with
which rig, a 3-day forecast with best bite windows, NC size/bag limits, a
satellite map with zones and your own private spots, and a catch log that
auto-tags every fish with the conditions it bit in.

Works offline once installed: tide predictions are cached for 4 days.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # logic tests (tides, regs, matrix, storage)
npm run build    # production build in dist/
npm run lint
```

Deploys to Vercel automatically: every push to `main` builds and goes live
(preview deploys for other branches). It's a static Vite site; `vercel.json` makes deep links like
`/forecast` work on refresh.

## Where things live

```
src/
  config.js            location, tide station, API coordinates: start here to move beaches
  data/
    species.js         THE species catalog (names, matrix profile, rig, bait)
    regulations.js     NC limits, keyed by species id, with source + effective date
    rigs.js            rig guide content
    zones.js           map zones (approximate coords; tweak if a pin is off)
  lib/                 pure logic, no React; covered by lib.test.js
    tides.js           NOAA fetch + interpolation, tide direction / slack / stage
    weather.js         Open-Meteo weather + marine (sea temp, waves)
    conditions.js      "what are conditions at time t" as plain numbers
    recommend.js       the matrix: transparent points system with reasons (WEIGHTS)
    forecast.js        hour-by-hour outlook and best windows
    regs.js            season / size / bag checks for the catch log
    catchLog.js        persisted catch log, import/export (JSON + CSV)
    settings.js        theme + saved spots
    time.js            everything in island time (America/New_York), not the phone's
  hooks/               useConditions (shared feed + offline cache), useNow, useBack
  components/          ui.jsx (Screen, Btn, Choice...), TideChart, RigDiagram
  screens/             one file per screen
```

## Tuning the matrix

Every recommendation is points with reasons, shown on the dashboard. Adjust a
species' temps, months, tide, light and zones in `data/species.js`, or the
weights in `lib/recommend.js`. Run `npm test` afterwards.

## Updating regulations

Edit `data/regulations.js` and bump `REGS_META.effective` / `checked`.
Source: NC Division of Marine Fisheries recreational size & bag limits.

## Data sources

- Tides: NOAA CO-OPS predictions, station 8659182 (Oak Island, Atlantic Ocean)
- Wind, air temp, sunrise/sunset: Open-Meteo forecast API
- Sea surface temp, waves: Open-Meteo marine API
- Satellite: Esri World Imagery

Not for navigation. Always confirm current limits with NCDMF before keeping fish.
