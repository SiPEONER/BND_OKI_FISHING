// Storage for community reports. Two implementations with the same interface:
// Postgres (production, via Neon on Vercel) and in-memory (tests / local dev).

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS reports (
    id text PRIMARY KEY,
    created_at timestamptz NOT NULL DEFAULT now(),
    t timestamptz NOT NULL,
    species_id text NOT NULL,
    zone_id text NOT NULL,
    status text NOT NULL,
    count integer,
    bait text,
    size_in real,
    note text,
    nickname text,
    cond jsonb,
    device text NOT NULL,
    ip_hash text,
    flags integer NOT NULL DEFAULT 0,
    hidden boolean NOT NULL DEFAULT false
  )`,
  `CREATE INDEX IF NOT EXISTS reports_created_idx ON reports (created_at DESC)`,
  `CREATE TABLE IF NOT EXISTS report_flags (
    report_id text NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    device text NOT NULL,
    PRIMARY KEY (report_id, device)
  )`,
]

const fromRow = (r) => ({
  id: r.id,
  createdAt: new Date(r.created_at).getTime(),
  t: new Date(r.t).getTime(),
  speciesId: r.species_id,
  zoneId: r.zone_id,
  status: r.status,
  count: r.count,
  bait: r.bait,
  sizeIn: r.size_in,
  note: r.note,
  nickname: r.nickname,
  cond: r.cond,
  device: r.device,
  flags: r.flags,
  hidden: r.hidden,
})

export function makePgStore(sql) {
  let ready = null
  const init = () => (ready ??= (async () => {
    for (const s of SCHEMA) await sql.query(s)
  })().catch((e) => {
    ready = null
    throw e
  }))

  return {
    init,
    async insert(r) {
      await init()
      await sql.query(
        `INSERT INTO reports (id, created_at, t, species_id, zone_id, status, count, bait, size_in, note, nickname, cond, device, ip_hash)
         VALUES ($1, to_timestamp($2 / 1000.0), to_timestamp($3 / 1000.0), $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [r.id, r.createdAt, r.t, r.speciesId, r.zoneId, r.status, r.count, r.bait, r.sizeIn, r.note, r.nickname,
          r.cond ? JSON.stringify(r.cond) : null, r.device, r.ipHash],
      )
    },
    async list({ since, includeHidden = false, maxFlags = 3, limit = 200 }) {
      await init()
      const rows = await sql.query(
        `SELECT * FROM reports WHERE created_at >= to_timestamp($1 / 1000.0)
         ${includeHidden ? '' : 'AND hidden = false AND flags < $3'}
         ORDER BY created_at DESC LIMIT $2`,
        includeHidden ? [since, limit] : [since, limit, maxFlags],
      )
      return rows.map(fromRow)
    },
    async countRecent({ device, ipHash, since }) {
      await init()
      const rows = await sql.query(
        `SELECT count(*)::int AS n FROM reports
         WHERE created_at >= to_timestamp($1 / 1000.0) AND (device = $2 OR (ip_hash IS NOT NULL AND ip_hash = $3))`,
        [since, device, ipHash],
      )
      return rows[0]?.n ?? 0
    },
    async flag(id, device) {
      await init()
      const ins = await sql.query(
        `INSERT INTO report_flags (report_id, device) SELECT $1, $2 WHERE EXISTS (SELECT 1 FROM reports WHERE id = $1)
         ON CONFLICT DO NOTHING RETURNING report_id`,
        [id, device],
      )
      if (!ins.length) return null
      const rows = await sql.query(`UPDATE reports SET flags = flags + 1 WHERE id = $1 RETURNING flags`, [id])
      return rows[0]?.flags ?? null
    },
    async remove(id, device) {
      await init()
      const rows = device
        ? await sql.query(`DELETE FROM reports WHERE id = $1 AND device = $2 RETURNING id`, [id, device])
        : await sql.query(`DELETE FROM reports WHERE id = $1 RETURNING id`, [id])
      return rows.length > 0
    },
    async setHidden(id, hidden) {
      await init()
      const rows = await sql.query(`UPDATE reports SET hidden = $2 WHERE id = $1 RETURNING id`, [id, hidden])
      return rows.length > 0
    },
  }
}

export function makeMemoryStore() {
  const rows = []
  const flags = new Set()
  return {
    rows,
    init: async () => {},
    async insert(r) {
      rows.push({ ...r, flags: 0, hidden: false })
    },
    async list({ since, includeHidden = false, maxFlags = 3, limit = 200 }) {
      return rows
        .filter((r) => r.createdAt >= since && (includeHidden || (!r.hidden && r.flags < maxFlags)))
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, limit)
        .map((r) => ({ ...r }))
    },
    async countRecent({ device, ipHash, since }) {
      return rows.filter((r) => r.createdAt >= since && (r.device === device || (ipHash && r.ipHash === ipHash))).length
    },
    async flag(id, device) {
      const r = rows.find((x) => x.id === id)
      const key = `${id}|${device}`
      if (!r || flags.has(key)) return null
      flags.add(key)
      return ++r.flags
    },
    async remove(id, device) {
      const i = rows.findIndex((r) => r.id === id && (!device || r.device === device))
      if (i < 0) return false
      rows.splice(i, 1)
      return true
    },
    async setHidden(id, hidden) {
      const r = rows.find((x) => x.id === id)
      if (!r) return false
      r.hidden = hidden
      return true
    },
  }
}
