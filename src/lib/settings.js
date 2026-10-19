import { createStore, uid } from './store.js'

export const THEMES = [
  { id: 'day', label: 'DAY' },
  { id: 'night', label: 'NIGHT' },
  { id: 'red', label: 'RED' },
]

export const settingsStore = createStore('oki.settings.v1', { theme: 'day' })
export const useSettings = () => settingsStore.use()

export function setTheme(theme) {
  settingsStore.set((s) => ({ ...s, theme }))
}

export function cycleTheme() {
  settingsStore.set((s) => {
    const i = THEMES.findIndex((t) => t.id === s.theme)
    return { ...s, theme: THEMES[(i + 1) % THEMES.length].id }
  })
}

export function applyTheme(theme) {
  document.documentElement.dataset.theme = theme
  const color = theme === 'day' ? '#000000' : '#000000'
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color)
}

// My spots: private pins dropped on the map.
export const spotStore = createStore('oki.spots.v1', [])
export const useSpots = () => spotStore.use()

export function addSpot({ name, lat, lng }) {
  const spot = { id: uid(), name: name.trim().toUpperCase() || 'MY SPOT', lat, lng, created: Date.now() }
  spotStore.set((list) => [...list, spot])
  return spot
}

export function renameSpot(id, name) {
  spotStore.set((list) => list.map((s) => (s.id === id ? { ...s, name: name.trim().toUpperCase() || s.name } : s)))
}

export function removeSpot(id) {
  spotStore.set((list) => list.filter((s) => s.id !== id))
}
