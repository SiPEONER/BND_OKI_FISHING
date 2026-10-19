import { useEffect, useSyncExternalStore } from 'react'
import { createStore, readJSON, uid, writeJSON } from './store.js'

// Client for /api/reports: shared feed state, offline cache, and a send queue
// so reports written with no signal go out when the phone reconnects.

const API = '/api/reports'
const CACHE_KEY = 'oki.reports.cache.v1'
const QUEUE_KEY = 'oki.reports.queue.v1'
const REFRESH_MS = 5 * 60 * 1000

// Per-phone identity: anonymous device id, saved crew code, nickname.
export const communityStore = createStore('oki.community.v1', { device: null, crew: null, nickname: '' })
export const useCommunity = () => communityStore.use()

export function deviceId() {
  let { device } = communityStore.get()
  if (!device) {
    device = uid().replace(/[^A-Za-z0-9-]/g, '').slice(0, 36)
    communityStore.set((s) => ({ ...s, device }))
  }
  return device
}

export const setCrew = (crew) => communityStore.set((s) => ({ ...s, crew: crew ? crew.trim().toUpperCase() : null }))
export const setNickname = (nickname) => communityStore.set((s) => ({ ...s, nickname: nickname.toUpperCase().slice(0, 20) }))

// ---- shared feed state ----------------------------------------------------
const cached = readJSON(CACHE_KEY, null)
let state = {
  reports: cached?.reports ?? [],
  updated: cached?.updated ?? null,
  status: 'idle', // idle | loading | ready | offline | unavailable
  error: null,
  queue: readJSON(QUEUE_KEY, []),
}
const listeners = new Set()
const set = (patch) => {
  state = { ...state, ...patch }
  listeners.forEach((l) => l())
}
const saveQueue = (queue) => {
  writeJSON(QUEUE_KEY, queue)
  set({ queue })
}

class ApiError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

async function api(method, body, { query = '' } = {}) {
  const res = await fetch(`${API}${query}`, {
    method,
    headers: { 'content-type': 'application/json', 'x-device': deviceId() },
    body: body ? JSON.stringify(body) : undefined,
  })
  let data = null
  try {
    data = await res.json()
  } catch {
    // Not JSON: e.g. local `vite dev` without the API, or an HTML error page.
    throw new ApiError(res.status === 200 ? 503 : res.status, 'COMMUNITY REPORTS UNAVAILABLE')
  }
  if (!res.ok) throw new ApiError(res.status, data?.error ?? 'SOMETHING WENT WRONG')
  return data
}

export async function refreshReports() {
  set({ status: state.updated ? state.status : 'loading' })
  try {
    const { reports } = await api('GET', null, { query: '?days=7' })
    const updated = Date.now()
    writeJSON(CACHE_KEY, { reports, updated })
    set({ reports, updated, status: 'ready', error: null })
  } catch (e) {
    if (e instanceof ApiError && (e.status === 503 || e.status === 404)) set({ status: 'unavailable', error: e.message })
    else set({ status: 'offline', error: 'OFFLINE: SHOWING SAVED REPORTS' })
  }
}

/** Send a report now, or queue it if there's no connection. */
export async function postReport(report) {
  const { crew } = communityStore.get()
  try {
    const { report: saved } = await api('POST', { action: 'create', crew, report })
    set({ reports: [saved, ...state.reports] })
    return { ok: true }
  } catch (e) {
    if (e instanceof ApiError) return { ok: false, error: e.message, status: e.status }
    saveQueue([...state.queue, { localId: uid(), crew, report }])
    return { ok: true, queued: true }
  }
}

let flushing = false
export async function flushQueue() {
  if (flushing || !state.queue.length) return
  flushing = true
  try {
    let queue = [...state.queue]
    while (queue.length) {
      const item = queue[0]
      try {
        await api('POST', { action: 'create', crew: item.crew, report: item.report })
      } catch (e) {
        if (!(e instanceof ApiError)) break // still offline: try later
        // Rejected by the server (stale, bad code...): drop it.
      }
      queue = queue.slice(1)
      saveQueue(queue)
    }
  } finally {
    flushing = false
  }
  refreshReports()
}

export async function checkCrew(code) {
  const { ok } = await api('POST', { action: 'check', crew: code })
  return ok
}

export async function flagReport(id) {
  await api('POST', { action: 'flag', id })
  set({ reports: state.reports.map((r) => (r.id === id ? { ...r, flaggedByMe: true } : r)) })
}

export async function deleteReport(id) {
  await api('POST', { action: 'delete', id })
  set({ reports: state.reports.filter((r) => r.id !== id) })
}

let started = false
function start() {
  if (started || typeof window === 'undefined') return
  started = true
  refreshReports().then(flushQueue)
  setInterval(() => document.visibilityState === 'visible' && refreshReports(), REFRESH_MS)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && Date.now() - (state.updated ?? 0) > 60 * 1000) refreshReports().then(flushQueue)
  })
  window.addEventListener('online', () => flushQueue().then(refreshReports))
}

const subscribe = (l) => {
  listeners.add(l)
  return () => listeners.delete(l)
}
const get = () => state

export function useReports() {
  useEffect(start, [])
  return useSyncExternalStore(subscribe, get, get)
}
