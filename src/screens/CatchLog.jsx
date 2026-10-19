import { Link, useSearchParams } from 'react-router'
import { useMemo } from 'react'
import { speciesById } from '../data/species.js'
import { zoneById } from '../data/zones.js'
import { useCatches } from '../lib/catchLog.js'
import { computeStats } from '../lib/stats.js'
import { useSpots } from '../lib/settings.js'
import { dateKey, fmtDay, fmtTime } from '../lib/time.js'
import { groupByDay } from '../lib/forecast.js'
import { useNow } from '../hooks/useNow.js'
import { Btn, Choice, Empty, Label, Screen, Section, Tag } from '../components/ui.jsx'

export default function CatchLog() {
  const catches = useCatches()
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'stats' ? 'stats' : 'history'

  return (
    <Screen
      title="MY LOG"
      footer={
        <Btn variant="primary" size="md" to="/log/new" className="text-xl">
          + LOG CATCH
        </Btn>
      }
    >
      <div className="p-4 border-b-4 border-ink">
        <Choice
          options={[
            { value: 'history', label: `HISTORY (${catches.length})` },
            { value: 'stats', label: 'STATS' },
          ]}
          value={tab}
          onChange={(v) => setParams(v === 'stats' ? { tab: 'stats' } : {}, { replace: true })}
        />
      </div>
      {catches.length === 0 ? (
        <Empty title="NO CATCHES YET">
          EVERY FISH YOU LOG IS AUTO-TAGGED WITH TIDE, WIND, WATER TEMP AND LIGHT, SO OVER TIME THIS SHOWS YOU WHAT ACTUALLY
          WORKS HERE. YOUR LOG STAYS ON THIS PHONE (BACK IT UP UNDER MORE).
        </Empty>
      ) : tab === 'stats' ? (
        <Stats catches={catches} />
      ) : (
        <History catches={catches} />
      )}
    </Screen>
  )
}

function History({ catches }) {
  const spots = useSpots()
  const days = useMemo(() => [...groupByDay(catches).entries()], [catches])
  return (
    <div>
      {days.map(([day, list]) => (
        <div key={day}>
          <div className="px-5 py-2 bg-ink text-paper font-mono text-xs font-bold flex justify-between sticky top-[60px] z-10">
            <span>{fmtDay(list[0].t)}</span>
            <span>
              {list.length} FISH · {list.filter((c) => c.kept).length} KEPT
            </span>
          </div>
          {list.map((c) => {
            const sp = speciesById(c.speciesId)
            const where = c.spotId ? spots.find((s) => s.id === c.spotId)?.name : zoneById(c.zoneId)?.name
            return (
              <Link key={c.id} to={`/log/${c.id}`} className="flex items-center gap-4 px-5 py-3 border-b-2 border-ink active:bg-soft">
                <div className="font-mono text-3xl font-black w-20 shrink-0 tracking-tighter">{c.length}"</div>
                <div className="min-w-0 flex-grow">
                  <div className="font-black text-lg leading-tight truncate">{sp?.name ?? c.speciesId}</div>
                  <div className="font-mono text-[11px] font-bold text-muted truncate">
                    {[fmtTime(c.t), c.cond?.tideDir, c.bait, where].filter(Boolean).join(' · ')}
                  </div>
                </div>
                <Tag invert={!c.kept}>{c.kept ? 'KEPT' : 'C&R'}</Tag>
              </Link>
            )
          })}
        </div>
      ))}
    </div>
  )
}

function Bars({ rows, labelOf = (r) => r.label }) {
  const max = Math.max(...rows.map((r) => r.count), 1)
  return (
    <div className="space-y-1.5">
      {rows.map((r) => (
        <div key={r.label} className="grid grid-cols-[7rem_1fr_2rem] items-center gap-2 font-mono text-xs font-bold">
          <span className="truncate">{labelOf(r)}</span>
          <div className="h-4 border-2 border-ink">
            <div className="h-full bg-ink" style={{ width: `${(r.count / max) * 100}%` }} />
          </div>
          <span className="text-right">{r.count}</span>
        </div>
      ))}
    </div>
  )
}

function Stats({ catches }) {
  const s = useMemo(() => computeStats(catches), [catches])
  const now = useNow()
  const thisMonth = catches.filter((c) => dateKey(c.t).slice(0, 7) === dateKey(now).slice(0, 7)).length
  return (
    <div>
      <div className="grid grid-cols-3 border-b-4 border-ink text-center">
        {[
          ['TOTAL', s.total],
          ['KEPT', s.kept],
          ['THIS MONTH', thisMonth],
        ].map(([label, v], i) => (
          <div key={label} className={`p-4 ${i < 2 ? 'border-r-4 border-ink' : ''}`}>
            <div className="text-[10px] font-bold text-muted">{label}</div>
            <div className="font-mono text-3xl font-black">{v}</div>
          </div>
        ))}
      </div>

      <Section label="PERSONAL BESTS">
        <div className="divide-y-2 divide-ink border-2 border-ink">
          {s.personalBests.map((c) => (
            <Link key={c.id} to={`/log/${c.id}`} className="flex justify-between items-center px-3 py-2 font-mono text-sm font-bold active:bg-soft">
              <span>{speciesById(c.speciesId)?.name ?? c.speciesId}</span>
              <span className="text-lg font-black">
                {c.length}" <span className="text-[10px] text-muted">{fmtDay(c.t)}</span>
              </span>
            </Link>
          ))}
        </div>
      </Section>

      <Section label="BY SPECIES" tone="soft">
        <Bars rows={s.bySpecies} labelOf={(r) => r.species?.short ?? r.label} />
      </Section>
      {s.byTide.length > 0 && (
        <Section label="WHEN THEY BIT: TIDE">
          <Bars rows={s.byTide} />
        </Section>
      )}
      {s.byLight.length > 0 && (
        <Section label="WHEN THEY BIT: LIGHT" tone="soft">
          <Bars rows={s.byLight} />
        </Section>
      )}
      {s.byBait.length > 0 && (
        <Section label="WHAT WORKED: BAIT">
          <Bars rows={s.byBait} />
        </Section>
      )}
      {s.byZone.length > 0 && (
        <Section label="WHERE" tone="soft">
          <Bars rows={s.byZone} labelOf={(r) => `${r.label} :: ${zoneById(r.label)?.name ?? ''}`} />
        </Section>
      )}
      <div className="p-5">
        <Label>BASED ON {s.total} LOGGED FISH. LOG EVERY FISH, EVEN SMALL ONES: THE PATTERNS GET SHARPER.</Label>
      </div>
    </div>
  )
}
