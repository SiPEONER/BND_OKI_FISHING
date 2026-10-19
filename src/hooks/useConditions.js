import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react'
import { REFRESH_MS, SITE } from '../config.js'
import { fetchTides } from '../lib/tides.js'
import { fetchMarine, fetchWeather } from '../lib/weather.js'
import { readJSON, writeJSON } from '../lib/store.js'

// One shared conditions feed for the whole app. Each source (tides, weather,
// marine) loads independently, so one API being down never blanks the others.
// The last good data is cached so the app still works with no signal.

const CACHE_KEY = 'oki.conditions.v2'
const SOURCES = {
  tides: (signal) => fetchTides({ stationId: SITE.tideStation.id, signal }),
  weather: (signal) => fetchWeather({ ...SITE.weather, signal }),
  marine: (signal) => fetchMarine({ ...SITE.marine, signal }),
}

const cached = readJSON(CACHE_KEY, null)
let state = {
  data: cached?.data ?? {},
  updated: cached?.updated ?? {},
  errors: {},
  syncing: false,
  online: typeof navigator === 'undefined' ? true : navigator.onLine,
}
const listeners = new Set()
const set = (patch) => {
  state = { ...state, ...patch }
  listeners.forEach((l) => l())
}

let inflight = null
async function sync() {
  if (inflight) return inflight
  const ctrl = new AbortController()
  const timeout = setTimeout(() => ctrl.abort(), 20000)
  set({ syncing: true })
  inflight = (async () => {
    const names = Object.keys(SOURCES)
    const results = await Promise.allSettled(names.map((n) => SOURCES[n](ctrl.signal)))
    const data = { ...state.data }
    const updated = { ...state.updated }
    const errors = {}
    results.forEach((r, i) => {
      const n = names[i]
      if (r.status === 'fulfilled') {
        data[n] = r.value
        updated[n] = Date.now()
      } else {
        errors[n] = String(r.reason?.message ?? r.reason)
        console.warn(`[conditions] ${n} failed:`, r.reason)
      }
    })
    writeJSON(CACHE_KEY, { data, updated })
    set({ data, updated, errors, syncing: false })
  })().finally(() => {
    clearTimeout(timeout)
    inflight = null
  })
  return inflight
}

let started = false
function start() {
  if (started || typeof window === 'undefined') return
  started = true
  sync()
  setInterval(() => document.visibilityState === 'visible' && sync(), REFRESH_MS)
  // Phones suspend timers: refresh when the app comes back to the foreground.
  document.addEventListener('visibilitychange', () => {
    const oldest = Math.min(...Object.keys(SOURCES).map((n) => state.updated[n] ?? 0))
    if (document.visibilityState === 'visible' && Date.now() - oldest > 2 * 60 * 1000) sync()
  })
  window.addEventListener('online', () => {
    set({ online: true })
    sync()
  })
  window.addEventListener('offline', () => set({ online: false }))
}

const subscribe = (l) => {
  listeners.add(l)
  return () => listeners.delete(l)
}
const get = () => state

export function useConditions() {
  const ref = useRef(false)
  useEffect(() => {
    if (!ref.current) {
      ref.current = true
      start()
    }
  }, [])
  const s = useSyncExternalStore(subscribe, get, get)
  const refresh = useCallback(() => sync(), [])
  const lastUpdated = Object.values(s.updated).length ? Math.min(...Object.values(s.updated)) : null
  const hasAny = Object.keys(s.data).length > 0
  return { ...s, refresh, lastUpdated, hasAny }
}
