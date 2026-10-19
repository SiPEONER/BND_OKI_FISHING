import { useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router'
import { BAITS, QUICK_LOG_IDS, SPECIES, speciesById } from '../data/species.js'
import { RIGS } from '../data/rigs.js'
import { ZONES } from '../data/zones.js'
import { addCatch, keptToday, removeCatch, updateCatch, useCatches } from '../lib/catchLog.js'
import { checkCatch } from '../lib/regs.js'
import { conditionsAt, snapshot } from '../lib/conditions.js'
import { recommend } from '../lib/recommend.js'
import { useConditions } from '../hooks/useConditions.js'
import { useNow } from '../hooks/useNow.js'
import { useSpots } from '../lib/settings.js'
import { fromLocalInput, toLocalInput } from '../lib/time.js'
import { Btn, Choice, Empty, Screen, Section } from '../components/ui.jsx'

const clamp = (v) => Math.min(99, Math.max(1, Math.round(v * 2) / 2))

export default function LogCatch() {
  const { id } = useParams()
  const catches = useCatches()
  const existing = id ? catches.find((c) => c.id === id) : null
  if (id && !existing) {
    return (
      <Screen title="LOG CATCH">
        <Empty title="NOT FOUND">THAT CATCH ISN'T IN YOUR LOG ANYMORE.</Empty>
      </Screen>
    )
  }
  return <CatchForm key={id ?? 'new'} existing={existing} catches={catches} />
}

function CatchForm({ existing, catches }) {
  const navigate = useNavigate()
  const location = useLocation()
  const cond = useConditions()
  const spots = useSpots()
  const now = useNow()

  // Default to whatever the matrix recommends right now. Computed once, so the
  // pick never changes under the user's thumb when data refreshes.
  const [defaultSpecies] = useState(() => {
    if (location.state?.speciesId) return location.state.speciesId
    const c = cond.hasAny ? conditionsAt(cond.data, Date.now()) : null
    return (c && recommend(c)?.species.id) || 'red-drum'
  })

  const [f, setF] = useState(() =>
    existing
      ? { ...existing, notes: existing.notes ?? '' }
      : {
          t: Date.now(),
          speciesId: defaultSpecies,
          length: speciesById(defaultSpecies)?.reg?.min ?? 18,
          bait: null,
          rigId: speciesById(defaultSpecies)?.profile?.rig ?? null,
          zoneId: null,
          spotId: null,
          kept: false,
          notes: '',
        },
  )
  const set = (patch) => setF((s) => ({ ...s, ...patch }))
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [showAll, setShowAll] = useState(!QUICK_LOG_IDS.includes(f.speciesId))

  const sp = speciesById(f.speciesId)
  const verdict = checkCatch(sp?.reg, f.length, {
    t: f.t,
    keptToday: keptToday(catches, f.speciesId, f.t, existing?.id),
  })

  // Conditions at the time of the catch (works for back-dated entries too).
  const cs = useMemo(() => {
    if (existing?.cond && existing.t === f.t) return existing.cond
    return cond.hasAny ? snapshot(conditionsAt(cond.data, f.t)) : null
  }, [cond.data, cond.hasAny, f.t, existing])

  const pickSpecies = (speciesId) => {
    const next = speciesById(speciesId)
    set({ speciesId, rigId: next?.profile?.rig ?? f.rigId })
  }

  const save = () => {
    const entry = {
      t: f.t, speciesId: f.speciesId, length: f.length, bait: f.bait, rigId: f.rigId,
      zoneId: f.zoneId, spotId: f.spotId, kept: f.kept, notes: f.notes.trim(), cond: cs,
    }
    if (existing) updateCatch(existing.id, entry)
    else addCatch(entry)
    navigate('/log', { replace: true })
  }

  const where = f.spotId ? `S:${f.spotId}` : f.zoneId ? `Z:${f.zoneId}` : null
  const speciesOptions = (showAll ? SPECIES.map((s) => s.id) : QUICK_LOG_IDS).map((sid) => ({
    value: sid,
    label: speciesById(sid).short,
  }))

  return (
    <Screen
      title={existing ? 'EDIT CATCH' : 'LOG CATCH'}
      backLabel="CANCEL"
      footer={
        <Btn variant="primary" size="xl" onClick={save}>
          {existing ? 'SAVE CHANGES' : 'SAVE TO LOG'}
        </Btn>
      }
    >
      <Section
        label="SPECIES"
        action={
          <button className="font-mono text-[11px] font-bold underline" onClick={() => setShowAll((v) => !v)}>
            {showAll ? 'FEWER' : 'ALL SPECIES'}
          </button>
        }
      >
        <Choice cols={3} size="sm" options={speciesOptions} value={f.speciesId} onChange={pickSpecies} />
      </Section>

      <Section label={`LENGTH (INCHES · ${sp?.reg?.measure === 'FL' ? 'FORK' : 'TOTAL'})`} tone="soft">
        <div className="flex items-center justify-between gap-3">
          <button
            aria-label="Shorter"
            onClick={() => set({ length: clamp(f.length - 0.5) })}
            className="w-16 h-16 shrink-0 border-4 border-ink bg-paper text-4xl font-black active:bg-ink active:text-paper"
          >
            -
          </button>
          <label className="flex items-baseline justify-center min-w-0">
            <span className="sr-only">Length in inches</span>
            <input
              inputMode="decimal"
              value={f.length}
              onChange={(e) => {
                const v = parseFloat(e.target.value)
                if (!Number.isNaN(v)) set({ length: Math.min(99, Math.max(0, v)) })
                else if (e.target.value === '') set({ length: 0 })
              }}
              onBlur={() => set({ length: clamp(f.length || 1) })}
              style={{ width: `${Math.max(2, String(f.length).length)}ch` }}
              className="bg-transparent text-7xl font-black font-mono tracking-tighter text-center outline-none"
            />
            <span className="text-6xl font-black font-mono">"</span>
          </label>
          <button
            aria-label="Longer"
            onClick={() => set({ length: clamp(f.length + 0.5) })}
            className="w-16 h-16 shrink-0 border-4 border-ink bg-paper text-4xl font-black active:bg-ink active:text-paper"
          >
            +
          </button>
        </div>
        <div className={`mt-4 border-4 border-ink p-3 ${verdict.ok === false ? 'bg-ink text-paper' : 'bg-paper'}`}>
          <div className="text-2xl font-black tracking-tighter">
            {verdict.ok === true ? '✓ ' : verdict.ok === false ? '✕ ' : ''}
            {verdict.verdict}
          </div>
          <div className="font-mono text-[11px] font-bold mt-0.5">{verdict.detail}</div>
        </div>
      </Section>

      <Section label="KEPT OR RELEASED">
        <Choice
          options={[
            { value: false, label: 'RELEASED' },
            { value: true, label: 'KEPT' },
          ]}
          value={f.kept}
          onChange={(kept) => set({ kept })}
        />
        {f.kept && verdict.ok === false && (
          <p className="mt-2 font-mono text-[11px] font-bold">
            HEADS UP: BY NC RULES THIS FISH IS NOT LEGAL TO KEEP ({verdict.verdict}).
          </p>
        )}
      </Section>

      <Section label="BAIT / GEAR">
        <Choice cols={3} size="sm" allowNone options={BAITS.map((b) => ({ value: b, label: b }))} value={f.bait} onChange={(bait) => set({ bait })} />
        <div className="mt-3">
          <Choice cols={2} size="sm" allowNone options={RIGS.map((r) => ({ value: r.id, label: r.name }))} value={f.rigId} onChange={(rigId) => set({ rigId })} />
        </div>
      </Section>

      <Section label="WHERE">
        <Choice
          cols={2}
          size="sm"
          allowNone
          options={[
            ...ZONES.map((z) => ({ value: `Z:${z.id}`, label: `${z.id} :: ${z.name}` })),
            ...spots.map((s) => ({ value: `S:${s.id}`, label: `★ ${s.name}` })),
          ]}
          value={where}
          onChange={(v) =>
            set({ zoneId: v?.startsWith('Z:') ? v.slice(2) : null, spotId: v?.startsWith('S:') ? v.slice(2) : null })
          }
        />
      </Section>

      <Section label="WHEN" tone="soft">
        <input
          type="datetime-local"
          value={toLocalInput(f.t)}
          max={toLocalInput(now)}
          onChange={(e) => e.target.value && set({ t: fromLocalInput(e.target.value) })}
          className="w-full border-4 border-ink bg-paper font-mono font-bold p-3 text-ink"
        />
        <div className="mt-3 font-mono text-[11px] font-bold leading-relaxed">
          <span className="text-muted">AUTO-TAGGED: </span>
          {cs
            ? [
                cs.tideDir,
                cs.tideLevel != null && `${cs.tideLevel > 0 ? '+' : ''}${cs.tideLevel} FT`,
                cs.windMph != null && `${cs.windDir ?? ''} ${cs.windMph} MPH`,
                cs.waterF != null && `WATER ${cs.waterF}°`,
                cs.light,
              ]
                .filter(Boolean)
                .join(' · ')
            : 'NO CONDITIONS DATA FOR THIS TIME'}
        </div>
      </Section>

      <Section label="NOTES">
        <textarea
          value={f.notes}
          onChange={(e) => set({ notes: e.target.value })}
          rows={3}
          placeholder="WHAT WORKED..."
          className="w-full border-4 border-ink bg-paper p-3 font-mono text-sm normal-case placeholder:uppercase placeholder:text-faint"
        />
      </Section>

      {existing && (
        <div className="p-5">
          {confirmDelete ? (
            <div className="grid grid-cols-2 gap-2">
              <Btn onClick={() => setConfirmDelete(false)}>KEEP IT</Btn>
              <Btn
                variant="primary"
                onClick={() => {
                  removeCatch(existing.id)
                  navigate('/log', { replace: true })
                }}
              >
                YES, DELETE
              </Btn>
            </div>
          ) : (
            <Btn variant="ghost" onClick={() => setConfirmDelete(true)}>
              DELETE THIS CATCH
            </Btn>
          )}
        </div>
      )}
    </Screen>
  )
}
