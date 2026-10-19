import { useState } from 'react'
import { useNavigate } from 'react-router'
import { BAITS, QUICK_LOG_IDS, speciesById } from '../data/species.js'
import { ZONES } from '../data/zones.js'
import { REPORT_STATUSES, REPORT_ZONE_ELSEWHERE } from '../data/community.js'
import { postReport, setNickname, useCommunity } from '../lib/community.js'
import { conditionsAt, snapshot } from '../lib/conditions.js'
import { useConditions } from '../hooks/useConditions.js'
import CrewGate from '../components/CrewGate.jsx'
import { Btn, Choice, Screen, Section } from '../components/ui.jsx'

export default function PostReport() {
  const { crew } = useCommunity()
  return (
    <Screen title="POST REPORT" backLabel="CANCEL">
      {crew ? <ReportForm /> : <CrewGate />}
    </Screen>
  )
}

function ReportForm() {
  const navigate = useNavigate()
  const cond = useConditions()
  const { nickname } = useCommunity()
  const [f, setF] = useState({ speciesId: null, zoneId: null, status: null, count: null, bait: null, note: '' })
  const [nick, setNick] = useState(nickname ?? '')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)
  const set = (patch) => setF((s) => ({ ...s, ...patch }))
  const ready = f.speciesId && f.zoneId && f.status

  const submit = async () => {
    setSending(true)
    setError(null)
    setNickname(nick)
    const now = Date.now()
    const c = cond.hasAny ? snapshot(conditionsAt(cond.data, now)) : null
    const res = await postReport({ ...f, t: now, note: f.note.trim() || null, nickname: nick.trim() || null, cond: c })
    setSending(false)
    if (!res.ok) return setError(res.error)
    navigate('/reports', { replace: true, state: { queued: res.queued } })
  }

  return (
    <>
      <Section label="WHAT">
        <Choice cols={3} size="sm" options={QUICK_LOG_IDS.map((id) => ({ value: id, label: speciesById(id).short }))} value={f.speciesId} onChange={(speciesId) => set({ speciesId })} />
      </Section>
      <Section label="WHERE" tone="soft">
        <Choice
          cols={2}
          size="sm"
          options={[
            ...ZONES.map((z) => ({ value: z.id, label: `${z.id} :: ${z.name}` })),
            { value: REPORT_ZONE_ELSEWHERE, label: 'ELSEWHERE' },
          ]}
          value={f.zoneId}
          onChange={(zoneId) => set({ zoneId })}
        />
        <p className="font-mono text-[10px] font-bold text-muted mt-2">ZONE ONLY. YOUR EXACT SPOT STAYS YOURS.</p>
      </Section>
      <Section label="HOW'S IT GOING">
        <Choice cols={2} size="sm" options={REPORT_STATUSES.map((s) => ({ value: s.id, label: s.label }))} value={f.status} onChange={(status) => set({ status })} />
      </Section>
      <Section label="DETAILS (OPTIONAL)" tone="soft">
        <div className="flex items-center gap-3 mb-3">
          <span className="font-mono text-xs font-bold w-16">FISH</span>
          <button className="w-11 h-11 border-4 border-ink font-black text-xl" onClick={() => set({ count: Math.max(0, (f.count ?? 1) - 1) })} aria-label="Fewer">
            -
          </button>
          <span className="font-mono text-2xl font-black w-10 text-center">{f.count ?? '--'}</span>
          <button className="w-11 h-11 border-4 border-ink font-black text-xl" onClick={() => set({ count: Math.min(200, (f.count ?? 0) + 1) })} aria-label="More">
            +
          </button>
        </div>
        <Choice cols={3} size="sm" allowNone options={BAITS.map((b) => ({ value: b, label: b }))} value={f.bait} onChange={(bait) => set({ bait })} />
        <textarea
          value={f.note}
          onChange={(e) => set({ note: e.target.value.slice(0, 280) })}
          rows={3}
          placeholder="WHAT ARE YOU SEEING? (NO LINKS)"
          className="mt-3 w-full border-4 border-ink bg-paper p-3 font-mono text-sm normal-case placeholder:uppercase placeholder:text-faint"
        />
        <div className="font-mono text-[10px] font-bold text-muted text-right">{f.note.length}/280</div>
      </Section>
      <Section label="POST AS">
        <input
          value={nick}
          onChange={(e) => setNick(e.target.value.toUpperCase().slice(0, 20))}
          placeholder="LOCAL ANGLER"
          className="w-full border-4 border-ink bg-paper p-3 font-black uppercase placeholder:text-faint"
        />
        <p className="font-mono text-[10px] font-bold text-muted mt-1">OPTIONAL NICKNAME. SAVED ON THIS PHONE.</p>
      </Section>
      <div className="p-5 sticky bottom-0 bg-paper border-t-4 border-ink">
        {error && <p className="mb-3 bg-ink text-paper font-mono text-xs font-bold px-2 py-1.5">{error}</p>}
        <Btn variant="primary" size="xl" onClick={submit} disabled={!ready || sending}>
          {sending ? 'SENDING...' : ready ? 'POST IT' : 'PICK WHAT / WHERE / HOW'}
        </Btn>
      </div>
    </>
  )
}
