import { useEffect, useState } from 'react'
import { speciesById } from '../data/species.js'
import { reportZoneName as zoneName, statusById } from '../data/community.js'
import { fmtDateTime } from '../lib/time.js'
import { Btn, Empty, Label, Screen, Section, Tag } from '../components/ui.jsx'

// Moderation page at /admin (not linked from the app). Needs ADMIN_KEY.

const KEY = 'oki.admin.key'
const getKey = () => {
  try {
    return sessionStorage.getItem(KEY) ?? ''
  } catch {
    return ''
  }
}

async function admin(key, method, body) {
  const res = await fetch('/api/admin', {
    method,
    headers: { 'content-type': 'application/json', 'x-admin-key': key },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({ error: 'API UNAVAILABLE' }))
  if (!res.ok) throw new Error(data.error ?? 'FAILED')
  return data
}

export default function Admin() {
  const [key, setKey] = useState(getKey)
  const [input, setInput] = useState('')
  const [rows, setRows] = useState(null)
  const [error, setError] = useState(null)

  const [nonce, setNonce] = useState(0)
  const load = () => setNonce((n) => n + 1)

  useEffect(() => {
    if (!key) return
    let alive = true
    admin(key, 'GET').then(
      ({ reports }) => alive && (setRows(reports), setError(null)),
      (e) => alive && (setError(e.message), setRows(null)),
    )
    return () => {
      alive = false
    }
  }, [key, nonce])

  const act = async (action, id) => {
    try {
      await admin(key, 'POST', { action, id })
      load()
    } catch (e) {
      setError(e.message)
    }
  }

  if (!key || error === 'WRONG ADMIN KEY') {
    return (
      <Screen title="ADMIN">
        <Section label="ADMIN KEY">
          <div className="flex gap-2">
            <input
              type="password"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-grow min-w-0 border-4 border-ink bg-paper p-3 font-mono"
            />
            <Btn
              variant="primary"
              size="sm"
              onClick={() => {
                try {
                  sessionStorage.setItem(KEY, input)
                } catch {
                  // session storage unavailable: key lives in memory only
                }
                setError(null)
                setKey(input)
              }}
            >
              GO
            </Btn>
          </div>
          {error && <p className="mt-2 font-mono text-xs font-bold">{error}</p>}
        </Section>
      </Screen>
    )
  }

  return (
    <Screen title="ADMIN" right={<button onClick={load} className="font-mono text-[10px] font-bold border-2 border-on-bar px-1.5 py-1">RELOAD</button>}>
      {error && <p className="p-4 bg-ink text-paper font-mono text-xs font-bold">{error}</p>}
      {!rows ? (
        <Empty title="LOADING..." />
      ) : rows.length === 0 ? (
        <Empty title="NO REPORTS">NOTHING IN THE LAST 30 DAYS.</Empty>
      ) : (
        <>
          <div className="p-4 border-b-4 border-ink">
            <Label>
              {rows.length} REPORTS · 30 DAYS · {rows.filter((r) => r.hidden).length} HIDDEN · {rows.filter((r) => r.flags > 0).length} FLAGGED
            </Label>
          </div>
          {rows.map((r) => (
            <div key={r.id} className={`px-5 py-3 border-b-2 border-ink ${r.hidden ? 'opacity-50' : ''}`}>
              <div className="flex flex-wrap gap-1.5 mb-1">
                <Tag>{statusById(r.status)?.label ?? r.status}</Tag>
                {r.flags > 0 && <Tag invert>{r.flags} FLAGS</Tag>}
                {r.hidden && <Tag invert>HIDDEN</Tag>}
              </div>
              <div className="font-black">{speciesById(r.speciesId)?.name}</div>
              <div className="font-mono text-[11px] font-bold">
                {zoneName(r.zoneId)} · {fmtDateTime(r.createdAt)} · {r.nickname ?? 'ANON'} · DEV {r.device}
              </div>
              {r.note && <p className="font-mono text-xs normal-case mt-1">{r.note}</p>}
              <div className="flex gap-2 mt-2">
                <Btn size="sm" onClick={() => act(r.hidden ? 'unhide' : 'hide', r.id)}>
                  {r.hidden ? 'UNHIDE' : 'HIDE'}
                </Btn>
                <Btn size="sm" variant="ghost" onClick={() => act('delete', r.id)}>
                  DELETE
                </Btn>
              </div>
            </div>
          ))}
        </>
      )}
    </Screen>
  )
}
