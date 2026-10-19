import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { speciesById } from '../data/species.js'
import { REPORT_ZONE_ELSEWHERE, reportZoneName as zoneName, statusById } from '../data/community.js'
import { deleteReport, flagReport, refreshReports, useCommunity, useReports } from '../lib/community.js'
import { useNow } from '../hooks/useNow.js'
import { fmtAgo, fmtTime } from '../lib/time.js'
import { Btn, Choice, Empty, Screen, Tag } from '../components/ui.jsx'

export default function Reports() {
  const feed = useReports()
  const { crew } = useCommunity()
  const now = useNow()
  const [range, setRange] = useState('24')
  const [zone, setZone] = useState('ALL')

  const list = useMemo(() => {
    const since = now - Number(range) * 3600e3
    return feed.reports.filter((r) => r.t >= since && (zone === 'ALL' || r.zoneId === zone)).sort((a, b) => b.t - a.t)
  }, [feed.reports, range, zone, now])

  return (
    <Screen
      title="REPORTS"
      footer={
        feed.status !== 'unavailable' && (
          <Btn variant="primary" to="/reports/new" className="text-xl">
            + POST REPORT
          </Btn>
        )
      }
    >
      <div className="p-4 border-b-4 border-ink space-y-2">
        <Choice
          options={[
            { value: '6', label: '6 HRS' },
            { value: '24', label: '24 HRS' },
            { value: '168', label: '7 DAYS' },
          ]}
          cols={3}
          size="sm"
          value={range}
          onChange={setRange}
        />
        <div className="flex gap-1.5 overflow-x-auto">
          {['ALL', 'A', 'B', 'C', 'D', REPORT_ZONE_ELSEWHERE].map((z) => (
            <button
              key={z}
              onClick={() => setZone(z)}
              className={`shrink-0 border-2 border-ink px-3 py-1.5 font-mono text-[11px] font-bold ${zone === z ? 'bg-ink text-paper' : ''}`}
            >
              {z === 'ALL' ? 'ALL ZONES' : z === REPORT_ZONE_ELSEWHERE ? 'ELSEWHERE' : `ZONE ${z}`}
            </button>
          ))}
        </div>
      </div>

      {feed.queue.length > 0 && (
        <div className="px-4 py-2 bg-ink text-paper font-mono text-[11px] font-bold">
          {feed.queue.length} REPORT{feed.queue.length > 1 ? 'S' : ''} WAITING FOR SIGNAL. THEY'LL SEND AUTOMATICALLY.
        </div>
      )}
      {feed.status === 'offline' && (
        <button onClick={refreshReports} className="w-full px-4 py-2 bg-soft border-b-2 border-ink font-mono text-[11px] font-bold text-left">
          OFFLINE · SHOWING SAVED REPORTS{feed.updated ? ` FROM ${fmtAgo(feed.updated, now)}` : ''} · TAP TO RETRY
        </button>
      )}

      {feed.status === 'unavailable' ? (
        <Empty title="NOT SWITCHED ON YET">COMMUNITY REPORTS NEED THEIR DATABASE CONNECTED IN VERCEL. ONCE THAT'S DONE THEY'LL SHOW UP HERE.</Empty>
      ) : feed.status === 'loading' && !feed.reports.length ? (
        <Empty title="LOADING..." />
      ) : list.length === 0 ? (
        <Empty title="QUIET OUT THERE">
          NO REPORTS {zone === 'ALL' ? '' : `IN ${zone === REPORT_ZONE_ELSEWHERE ? 'THAT AREA' : `ZONE ${zone}`} `}IN THIS WINDOW. FISHING? POST WHAT
          YOU'RE SEEING, EVEN IF IT'S SLOW. SLOW IS USEFUL INTEL TOO.
          {!crew && ' YOU\'LL NEED THE CREW CODE FROM THE OKI FISHING GROUP.'}
        </Empty>
      ) : (
        <div>
          {list.map((r) => (
            <ReportCard key={r.id} r={r} now={now} />
          ))}
        </div>
      )}
      <div className="p-5 font-mono text-[10px] font-bold text-muted leading-relaxed">
        REPORTS ARE ZONE-LEVEL ONLY, NO EXACT SPOTS. 3 FLAGS HIDES A REPORT. BE COOL, KEEP IT LOCAL.{' '}
        <Link to="/more" className="underline text-ink">
          CREW CODE & NICKNAME →
        </Link>
      </div>
    </Screen>
  )
}

export function ReportCard({ r, now, compact = false }) {
  const [confirm, setConfirm] = useState(false)
  const [msg, setMsg] = useState(null)
  const sp = speciesById(r.speciesId)
  const st = statusById(r.status)
  const extras = [r.count != null && `${r.count} FISH`, r.sizeIn && `${r.sizeIn}"`, r.bait].filter(Boolean)
  const cond = r.cond
    ? [r.cond.tideDir, r.cond.windMph != null && `${r.cond.windDir ?? ''} ${r.cond.windMph}`, r.cond.waterF != null && `${r.cond.waterF}°`]
        .filter(Boolean)
        .join(' · ')
    : ''

  const act = async (fn, done) => {
    try {
      await fn()
      setMsg(done)
    } catch (e) {
      setMsg(String(e.message ?? 'FAILED').toUpperCase())
    }
    setConfirm(false)
  }

  return (
    <article className="px-5 py-4 border-b-2 border-ink">
      <div className="flex items-center justify-between gap-2 mb-1">
        <Tag invert={!st?.good}>{st?.label ?? r.status}</Tag>
        <span className="font-mono text-[11px] font-bold text-muted">
          {fmtAgo(r.t, now)} · {fmtTime(r.t)}
        </span>
      </div>
      <div className="text-2xl font-black tracking-tighter leading-tight">{sp?.name ?? r.speciesId}</div>
      <div className="font-mono text-[11px] font-bold">
        {zoneName(r.zoneId)}
        {extras.length > 0 && ` · ${extras.join(' · ')}`}
      </div>
      {r.note && !compact && <p className="font-mono text-xs normal-case mt-2 leading-relaxed border-l-4 border-ink pl-3">{r.note}</p>}
      {!compact && (
        <div className="flex items-center justify-between gap-2 mt-2">
          <span className="font-mono text-[10px] font-bold text-muted truncate">
            — {r.nickname ?? 'LOCAL ANGLER'}
            {cond && ` · ${cond}`}
          </span>
          {msg ? (
            <span className="font-mono text-[10px] font-bold">{msg}</span>
          ) : confirm ? (
            <span className="flex gap-1.5 shrink-0">
              <Btn size="sm" onClick={() => setConfirm(false)}>NO</Btn>
              <Btn
                size="sm"
                variant="primary"
                onClick={() => (r.mine ? act(() => deleteReport(r.id), 'DELETED') : act(() => flagReport(r.id), 'FLAGGED. THANKS'))}
              >
                {r.mine ? 'DELETE' : 'FLAG'}
              </Btn>
            </span>
          ) : (
            !r.flaggedByMe && (
              <button onClick={() => setConfirm(true)} className="font-mono text-[10px] font-bold underline shrink-0">
                {r.mine ? 'DELETE MINE' : 'FLAG'}
              </button>
            )
          )}
        </div>
      )}
    </article>
  )
}

