import { describe, expect, it } from 'vitest'
import { handleAdmin, handleReports, RATE_LIMIT_PER_HOUR, validateReport } from './reports.js'
import { makeMemoryStore } from './store.js'

const NOW = Date.UTC(2026, 9, 19, 22, 0)
const env = { CREW_CODE: 'drumrun', ADMIN_KEY: 'admin-secret' }
const DEV = 'device-aaaa-1111'

function req(method, body, { device = DEV, ip = '1.2.3.4', query = '', admin } = {}) {
  const headers = { 'content-type': 'application/json', 'x-forwarded-for': ip }
  if (device) headers['x-device'] = device
  if (admin) headers['x-admin-key'] = admin
  return new Request(`https://oki.test/api/reports${query}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
}

const good = { speciesId: 'red-drum', zoneId: 'A', status: 'CATCHING', count: 2, note: 'Drum on cut mullet at the point' }

async function call(store, r, now = NOW) {
  const res = await handleReports(r, { store, env, now })
  return { status: res.status, body: await res.json() }
}

describe('validateReport', () => {
  it('accepts a good report and fills defaults', () => {
    const r = validateReport({ ...good, nickname: 'salty dog' }, NOW)
    expect(r.t).toBe(NOW)
    expect(r.nickname).toBe('SALTY DOG')
  })
  it('rejects bad species / zone / status / links / old reports', () => {
    expect(() => validateReport({ ...good, speciesId: 'shark' }, NOW)).toThrow('SPECIES')
    expect(() => validateReport({ ...good, zoneId: 'Q' }, NOW)).toThrow('ZONE')
    expect(() => validateReport({ ...good, status: 'GREAT' }, NOW)).toThrow()
    expect(() => validateReport({ ...good, note: 'buy bait at www.example.com' }, NOW)).toThrow('LINKS')
    expect(() => validateReport({ ...good, note: 'see https://x.y' }, NOW)).toThrow('LINKS')
    expect(() => validateReport({ ...good, t: NOW - 13 * 3600e3 }, NOW)).toThrow('12 HOURS')
    expect(() => validateReport({ ...good, note: 'x'.repeat(281) }, NOW)).toThrow('TOO LONG')
    expect(() => validateReport({ ...good, nickname: '<script>' }, NOW)).toThrow('NICKNAME')
  })
  it('allows "elsewhere" zone and strips junk from cond', () => {
    const r = validateReport({ ...good, zoneId: 'X', cond: { tideDir: 'INCOMING', waterF: 72, evil: 'x', windMph: 999 } }, NOW)
    expect(r.cond).toMatchObject({ tideDir: 'INCOMING', waterF: 72, windMph: null })
    expect(r.cond.evil).toBeUndefined()
  })
})

describe('reports API', () => {
  it('checks the crew code (case-insensitive)', async () => {
    const store = makeMemoryStore()
    expect((await call(store, req('POST', { action: 'check', crew: 'DrumRun' }))).body.ok).toBe(true)
    expect((await call(store, req('POST', { action: 'check', crew: 'nope' }))).body.ok).toBe(false)
  })

  it('creates with the right code, lists without leaking device ids', async () => {
    const store = makeMemoryStore()
    const bad = await call(store, req('POST', { action: 'create', crew: 'wrong', report: good }))
    expect(bad.status).toBe(403)
    const ok = await call(store, req('POST', { action: 'create', crew: 'drumrun', report: good }))
    expect(ok.status).toBe(201)
    expect(ok.body.report.mine).toBe(true)

    const mine = await call(store, req('GET'))
    expect(mine.body.reports).toHaveLength(1)
    expect(mine.body.reports[0].mine).toBe(true)
    expect(mine.body.reports[0].device).toBeUndefined()
    const theirs = await call(store, req('GET', null, { device: 'someone-else-999' }))
    expect(theirs.body.reports[0].mine).toBe(false)
    expect(JSON.stringify(theirs.body)).not.toContain(DEV)
  })

  it('rate limits per device and per IP', async () => {
    const store = makeMemoryStore()
    for (let i = 0; i < RATE_LIMIT_PER_HOUR; i++) {
      expect((await call(store, req('POST', { action: 'create', crew: 'drumrun', report: good }))).status).toBe(201)
    }
    expect((await call(store, req('POST', { action: 'create', crew: 'drumrun', report: good }))).status).toBe(429)
    // New device, same IP: still limited
    expect((await call(store, req('POST', { action: 'create', crew: 'drumrun', report: good }, { device: 'other-device-22' }))).status).toBe(429)
    // An hour later: fine again
    expect((await call(store, req('POST', { action: 'create', crew: 'drumrun', report: good }), NOW + 3600e3 + 1)).status).toBe(201)
  })

  it('hides a report after 3 distinct flags; one flag per phone', async () => {
    const store = makeMemoryStore()
    const { body } = await call(store, req('POST', { action: 'create', crew: 'drumrun', report: good }))
    const id = body.report.id
    for (const d of ['flagger-one-1', 'flagger-one-1', 'flagger-two-2']) {
      await call(store, req('POST', { action: 'flag', id }, { device: d }))
    }
    expect((await call(store, req('GET'))).body.reports).toHaveLength(1)
    await call(store, req('POST', { action: 'flag', id }, { device: 'flagger-three-3' }))
    expect((await call(store, req('GET'))).body.reports).toHaveLength(0)
  })

  it('only lets you delete your own report', async () => {
    const store = makeMemoryStore()
    const { body } = await call(store, req('POST', { action: 'create', crew: 'drumrun', report: good }))
    expect((await call(store, req('POST', { action: 'delete', id: body.report.id }, { device: 'not-the-owner-1' }))).status).toBe(404)
    expect((await call(store, req('POST', { action: 'delete', id: body.report.id }))).status).toBe(200)
  })

  it('only returns reports from the requested window', async () => {
    const store = makeMemoryStore()
    await call(store, req('POST', { action: 'create', crew: 'drumrun', report: good }), NOW - 3 * 86400e3)
    await call(store, req('POST', { action: 'create', crew: 'drumrun', report: good }, { ip: '9.9.9.9' }))
    expect((await call(store, req('GET', null, { query: '?days=2' }))).body.reports).toHaveLength(1)
    expect((await call(store, req('GET', null, { query: '?days=7' }))).body.reports).toHaveLength(2)
  })

  it('fails safely when not set up', async () => {
    expect((await call(null, req('GET'))).status).toBe(503)
    const res = await handleReports(req('POST', { action: 'check', crew: 'x' }), { store: makeMemoryStore(), env: {}, now: NOW })
    expect(res.status).toBe(503)
  })
})

describe('admin API', () => {
  it('requires the key, can hide and delete', async () => {
    const store = makeMemoryStore()
    const { body } = await call(store, req('POST', { action: 'create', crew: 'drumrun', report: good }))
    const id = body.report.id
    const admin = (r) => handleAdmin(r, { store, env, now: NOW })

    expect((await admin(req('GET', null, { admin: 'guess' }))).status).toBe(401)
    expect((await admin(req('GET'))).status).toBe(401)
    expect((await admin(req('POST', { action: 'hide', id }, { admin: 'admin-secret' }))).status).toBe(200)
    expect((await call(store, req('GET'))).body.reports).toHaveLength(0)
    const list = await (await admin(req('GET', null, { admin: 'admin-secret' }))).json()
    expect(list.reports[0].hidden).toBe(true)
    expect((await admin(req('POST', { action: 'delete', id }, { admin: 'admin-secret' }))).status).toBe(200)
    expect(store.rows).toHaveLength(0)
  })
})
