import { useSyncExternalStore } from 'react'

// Tiny persisted store: localStorage-backed, shared across components,
// synced across tabs, and safe when storage is unavailable (private mode).

export function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw == null ? fallback : JSON.parse(raw)
  } catch {
    return fallback
  }
}

export function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

export function createStore(key, initial) {
  let state = readJSON(key, initial)
  const listeners = new Set()
  const emit = () => listeners.forEach((l) => l())

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (e) => {
      if (e.key === key) {
        state = readJSON(key, initial)
        emit()
      }
    })
  }

  return {
    get: () => state,
    set(next) {
      state = typeof next === 'function' ? next(state) : next
      writeJSON(key, state)
      emit()
    },
    subscribe(l) {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    use() {
      return useSyncExternalStore(this.subscribe, this.get, this.get)
    },
  }
}

export const uid = () =>
  (globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`)
