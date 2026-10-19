import { useMemo } from 'react'
import { Link } from 'react-router'
import { SITE } from '../config.js'
import { useConditions } from '../hooks/useConditions.js'
import { useNow } from '../hooks/useNow.js'
import { conditionsAt } from '../lib/conditions.js'
import { recommend, biteLabel } from '../lib/recommend.js'
import { bagText, sizeText, isSeasonOpen } from '../lib/regs.js'
import { useCatches } from '../lib/catchLog.js'
import { cycleTheme, useSettings, THEMES } from '../lib/settings.js'
import { skyLabel } from '../lib/weather.js'
import { HOUR, dateKey, fmtAgo, fmtDuration, fmtTime } from '../lib/time.js'
import { zoneLabel } from '../data/zones.js'
import TideChart from '../components/TideChart.jsx'
import { Btn, Label, Screen, Stat, Tag } from '../components/ui.jsx'

const ft = (v) => (v == null ? '--' : `${v > 0 ? '+' : ''}${v.toFixed(1)} FT`)
const deg = (v) => (v == null ? '--' : `${Math.round(v)}°F`)

export default function Dashboard() {
  const cond = useConditions()
  const now = useNow(30 * 1000)
  const catches = useCatches()
  const { theme } = useSettings()

  const c = useMemo(() => (cond.hasAny ? conditionsAt(cond.data, now, { now }) : null), [cond.data, cond.hasAny, now])
  const rec = useMemo(() => (c && (c.tide || c.waterF != null || c.windMph != null) ? recommend(c) : null), [c])
  const todayCount = catches.filter((x) => dateKey(x.t) === dateKey(now)).length

  const tide = c?.tide
  const loading = !cond.hasAny && cond.syncing
  const tideHeadline = tide ? (tide.slack ? 'SLACK' : tide.direction) : loading ? 'SYNCING...' : 'NO TIDE DATA'

  return (
    <Screen>
      <header className="border-b-4 border-ink px-4 py-3 flex justify-between items-center bg-bar text-on-bar">
        <h1 className="text-2xl font-black tracking-tighter">
          {SITE.brand} <span className="relative -top-0.5 mx-0.5 tracking-widest">::</span> {SITE.name}
        </h1>
        <button
          onClick={cycleTheme}
          className="font-mono text-xs font-bold border-2 border-on-bar px-2 py-1 active:opacity-60"
          aria-label="Switch theme"
        >
          {THEMES.find((t) => t.id === theme)?.label ?? 'DAY'}
        </button>
      </header>

      {/* TIDE */}
      <Link to="/forecast" className="block p-5 border-b-4 border-ink bg-paper relative active:bg-soft">
        {cond.syncing && <span className="absolute top-4 right-4 w-3 h-3 bg-ink rounded-full animate-ping" aria-label="Syncing" />}
        <Label className="text-center mb-1">LIVE TIDE STATE</Label>
        <div className={`text-6xl font-black tracking-tighter text-center leading-none mb-3 ${loading ? 'animate-pulse text-muted' : ''}`}>
          {tideHeadline}
        </div>
        <div className="flex justify-center items-center gap-2 mb-3">
          <span className="font-mono text-xl border-4 border-ink px-3 py-0.5 font-bold">
            {tide && !tide.slack ? (tide.direction === 'INCOMING' ? '▲ ' : '▼ ') : ''}
            {ft(c?.level)}
          </span>
        </div>
        {tide && (
          <div className="font-mono text-xs font-bold tracking-wider bg-ink text-paper px-3 py-1.5 text-center">
            NEXT {tide.next.type === 'H' ? 'HIGH' : 'LOW'} {tide.next.v.toFixed(1)} FT AT {fmtTime(tide.next.t)} · IN {fmtDuration(tide.toNext)}
          </div>
        )}
        {cond.data.tides && (
          <div className="mt-3">
            <TideChart curve={cond.data.tides.curve} hilo={cond.data.tides.hilo} from={now - 6 * HOUR} to={now + 18 * HOUR} now={now} height={120} />
          </div>
        )}
      </Link>

      {/* CONDITIONS */}
      <div className="grid grid-cols-2 border-b-4 border-ink">
        <Stat
          className="border-r-4 border-b-4 border-ink"
          label="WIND"
          value={c?.windMph != null ? `${c.windDir} ${Math.round(c.windMph)}` : '--'}
          sub={c?.gustMph != null ? `MPH · GUST ${Math.round(c.gustMph)}` : 'MPH'}
          dim={c?.windMph == null}
        />
        <Stat className="border-b-4 border-ink" label="WATER" value={deg(c?.waterF)} sub="SEA SURFACE" dim={c?.waterF == null} />
        <Stat
          className="border-r-4 border-ink"
          label="SURF"
          value={c?.waveFt != null ? `${c.waveFt.toFixed(1)} FT` : '--'}
          sub={c?.periodS != null ? `${Math.round(c.periodS)} SEC PERIOD` : null}
          dim={c?.waveFt == null}
        />
        <Stat label="AIR" value={deg(c?.airF)} sub={skyLabel(c?.code)} dim={c?.airF == null} />
      </div>

      {/* MATRIX */}
      <section className="p-5 border-b-4 border-ink bg-soft">
        <div className="flex justify-between items-center mb-3">
          <Label>MATRIX RECOMMENDATION</Label>
          {rec && <Tag>BITE: {biteLabel(rec.score)} {rec.score}</Tag>}
        </div>
        {rec ? (
          <>
            <Link to="/regs" className="block text-5xl font-black tracking-tighter leading-none mb-2">
              {rec.species.name}
            </Link>
            <div className="font-mono text-[11px] font-bold text-muted mb-3">
              NC: {sizeText(rec.species.reg)} · {bagText(rec.species.reg)}
              {!isSeasonOpen(rec.species.reg, now) && ' · SEASON CLOSED, RELEASE'}
            </div>
            <div className="flex flex-wrap gap-1.5 mb-5">
              {rec.reasons.map((r) => (
                <Tag key={r.text} invert={!r.good}>
                  {r.good ? '+ ' : '- '}
                  {r.text}
                </Tag>
              ))}
            </div>
            <div className="space-y-4 font-mono">
              <div>
                <span className="text-muted text-xs font-sans font-bold block mb-1">LOCATION</span>
                <Link
                  to={rec.classified ? '/map' : `/map?zone=${rec.zone?.id}`}
                  className="block border-b-4 border-ink pb-1.5 text-xl font-black hover:bg-ink hover:text-paper"
                >
                  {rec.classified ? 'CLASSIFIED :: ZONE X' : zoneLabel(rec.zone)}
                </Link>
                {rec.zoneWhy && !rec.classified && <span className="text-[11px] font-bold text-muted">{rec.zoneWhy}</span>}
              </div>
              <div>
                <span className="text-muted text-xs font-sans font-bold block mb-1">SETUP</span>
                <Link to={`/rigs#${rec.rig.id}`} className="block border-b-4 border-ink pb-1.5 text-xl font-black hover:bg-ink hover:text-paper">
                  {rec.rig.name} →
                </Link>
                <span className="text-[11px] font-bold text-muted">{rec.bait}</span>
              </div>
            </div>
            <div className="mt-5 font-mono text-[11px] font-bold">
              <span className="text-muted">ALSO: </span>
              {rec.ranked.slice(1, 4).map((r, i) => (
                <span key={r.species.id}>
                  {i > 0 && ' / '}
                  {r.species.short} {r.score}
                </span>
              ))}
            </div>
          </>
        ) : (
          <div className={`text-4xl font-black tracking-tighter ${loading ? 'animate-pulse text-muted' : ''}`}>
            {loading ? 'CALCULATING...' : 'NO DATA YET'}
          </div>
        )}
      </section>

      {/* ACTIONS */}
      <div className="p-5 flex-grow flex flex-col justify-end gap-3">
        <Btn variant="primary" size="xl" to="/log/new">
          LOG CATCH
        </Btn>
        <div className="grid grid-cols-3 gap-2">
          <Btn size="md" to="/forecast" className="text-xs">FORECAST</Btn>
          <Btn size="md" to="/rigs" className="text-xs">HOW-TO RIGS</Btn>
          <Btn size="md" to="/regs" className="text-xs">REGULATIONS</Btn>
          <Btn size="md" to="/map" className="text-xs">MAP</Btn>
          <Btn size="md" to="/log" className="text-xs">MY LOG{todayCount ? ` (${todayCount})` : ''}</Btn>
          <Btn size="md" to="/more" className="text-xs">MORE</Btn>
        </div>
      </div>

      <SyncFooter cond={cond} now={now} />
    </Screen>
  )
}

function SyncFooter({ cond, now }) {
  const failed = Object.keys(cond.errors)
  let msg
  if (!cond.online) msg = cond.lastUpdated ? `OFFLINE · DATA FROM ${fmtAgo(cond.lastUpdated, now)}` : 'OFFLINE'
  else if (cond.syncing) msg = 'SYNCING...'
  else if (failed.length) msg = `${failed.join(' + ').toUpperCase()} UNAVAILABLE · TAP TO RETRY`
  else if (cond.lastUpdated) msg = `SYNCED ${fmtAgo(cond.lastUpdated, now)}`
  else msg = 'NOT SYNCED'
  return (
    <button
      onClick={cond.refresh}
      className={`w-full px-4 py-2.5 font-mono text-[10px] font-bold tracking-widest border-t-4 border-ink text-left flex justify-between ${
        !cond.online || failed.length ? 'bg-ink text-paper' : 'text-muted'
      }`}
    >
      <span>{msg}</span>
      <span>NOAA · OPEN-METEO · {SITE.version}</span>
    </button>
  )
}
