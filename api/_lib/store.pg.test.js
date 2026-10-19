import { describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { makePgStore } from './store.js'
import { handleReports } from './reports.js'

// Runs the real Postgres SQL against an in-process Postgres (PGlite).
describe('postgres store', () => {
  it('round-trips through the real SQL', async () => {
    const db = new PGlite()
    const store = makePgStore({ query: async (text, params) => (await db.query(text, params)).rows })
    const env = { CREW_CODE: 'drumrun' }
    const now = Date.UTC(2026, 9, 19, 22, 0)
    const mk = (device, ip, extra = {}) =>
      handleReports(
        new Request('https://x/api/reports', {
          method: 'POST',
          headers: { 'x-device': device, 'x-forwarded-for': ip },
          body: JSON.stringify({ action: 'create', crew: 'drumrun', report: { speciesId: 'flounder', zoneId: 'D', status: 'BITES', sizeIn: 16.5, cond: { tideDir: 'OUTGOING', waterF: 71 }, ...extra } }),
        }),
        { store, env, now },
      )
    const res = await mk('device-pg-0001', '5.5.5.5', { nickname: 'canal rat' })
    expect(res.status).toBe(201)
    const { report } = await res.json()

    const list = await store.list({ since: now - 3600e3 })
    expect(list).toHaveLength(1)
    expect(list[0]).toMatchObject({ id: report.id, speciesId: 'flounder', sizeIn: 16.5, nickname: 'CANAL RAT', flags: 0, hidden: false })
    expect(list[0].cond.tideDir).toBe('OUTGOING')
    expect(list[0].createdAt).toBe(now)

    expect(await store.countRecent({ device: 'device-pg-0001', ipHash: 'nope', since: now - 3600e3 })).toBe(1)
    expect(await store.flag(report.id, 'flagger-1')).toBe(1)
    expect(await store.flag(report.id, 'flagger-1')).toBeNull()
    expect(await store.flag('missing', 'flagger-1')).toBeNull()
    expect(await store.flag(report.id, 'flagger-2')).toBe(2)
    expect(await store.flag(report.id, 'flagger-3')).toBe(3)
    expect(await store.list({ since: now - 3600e3, maxFlags: 3 })).toHaveLength(0)
    expect(await store.list({ since: now - 3600e3, includeHidden: true })).toHaveLength(1)
    expect(await store.setHidden(report.id, true)).toBe(true)
    expect(await store.remove(report.id, 'someone-else')).toBe(false)
    expect(await store.remove(report.id, 'device-pg-0001')).toBe(true)
    expect(await store.list({ since: 0, includeHidden: true })).toHaveLength(0)
  })
})
