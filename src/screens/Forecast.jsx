import { useMemo } from 'react'
import { Link } from 'react-router'
import { useConditions } from '../hooks/useConditions.js'
import { useNow } from '../hooks/useNow.js'
import { bestWindows, groupByDay, hourlyOutlook, topWindows, WINDOW_THRESHOLD } from '../lib/forecast.js'
import { moonPhase } from '../lib/moon.js'
import { compass } from '../lib/weather.js'
import { DAY, HOUR, dateKey, fmtDay, fmtHour, fmtTime, fromLocalInput } from '../lib/time.js'
import { zoneLabel } from '../data/zones.js'
import TideChart from '../components/TideChart.jsx'
import { Empty, Label, Screen, Tag } from '../components/ui.jsx'

const dayStart = (t) => fromLocalInput(`${dateKey(t)}T00:00`)
const range = (vals) => {
  const v = vals.filter((x) => x != null)
  return v.length ? [Math.round(Math.min(...v)), Math.round(Math.max(...v))] : null
}

export default function Forecast() {
  const cond = useConditions()
  const now = useNow(5 * 60 * 1000)
  const { data } = cond

  const outlook = useMemo(() => (cond.hasAny ? hourlyOutlook(data, now, 72) : []), [data, cond.hasAny, now])
  const windows = useMemo(() => bestWindows(outlook), [outlook])
  const best = useMemo(() => [...windows].sort((a, b) => b.peak - a.peak)[0], [windows])

  const days = useMemo(() => {
    const first = dayStart(now)
    return [0, 1, 2].map((i) => {
      const from = dayStart(first + i * DAY + 2 * HOUR) // +2h survives DST shifts
      const to = dayStart(from + DAY + 2 * HOUR)
      return { from, to, key: dateKey(from) }
    })
  }, [now])

  const byDayWindows = groupByDay(windows)
  const byDayHours = groupByDay(outlook)

  if (!cond.hasAny) {
    return (
      <Screen title="FORECAST">
        <Empty title={cond.syncing ? 'SYNCING...' : 'NO DATA'}>FORECAST NEEDS ONE SUCCESSFUL SYNC. CHECK YOUR SIGNAL.</Empty>
      </Screen>
    )
  }

  return (
    <Screen title="FORECAST">
      <section className="p-5 border-b-4 border-ink bg-bar text-on-bar">
        <Label className="!text-on-bar opacity-70 mb-1">BEST BET · NEXT 72 HRS</Label>
        {best ? (
          <>
            <div className="text-4xl font-black tracking-tighter leading-none">{best.species.name}</div>
            <div className="font-mono text-sm font-bold mt-2">
              {fmtDay(best.start)} · {fmtTime(best.start)}-{fmtTime(best.end)}
            </div>
            <div className="font-mono text-xs font-bold opacity-70 mt-1">
              SCORE {best.peak} · {zoneLabel(best.zone)}
            </div>
          </>
        ) : (
          <div className="font-mono text-sm font-bold">NO WINDOW SCORES {WINDOW_THRESHOLD}+ IN THE NEXT 3 DAYS. FISH THE TIDE CHANGES.</div>
        )}
      </section>

      {days.map((d) => {
        const turns = (data.tides?.hilo ?? []).filter((p) => p.t >= d.from && p.t < d.to)
        const sun = data.weather?.daily?.find((x) => dateKey(x.sunrise) === d.key)
        const hours = byDayHours.get(d.key) ?? []
        const wx = (data.weather?.hourly ?? []).filter((h) => h.t >= d.from && h.t < d.to && h.t >= now - HOUR)
        const wind = range(wx.map((h) => h.windMph))
        const gust = range(wx.map((h) => h.gustMph))
        const rain = range(wx.map((h) => h.precipPct))
        const mainDir = compass(wx.length ? wx[Math.floor(wx.length / 2)].windDeg : null)
        const water = range(hours.map((h) => h.c.waterF))
        const waves = (data.marine?.hourly ?? []).filter((h) => h.t >= d.from && h.t < d.to).map((h) => h.waveFt)
        const wave = waves.filter((x) => x != null).length ? Math.max(...waves.filter((x) => x != null)) : null
        const moon = moonPhase(d.from + 12 * HOUR)
        const dayWindows = topWindows(byDayWindows.get(d.key) ?? [])
        return (
          <section key={d.key} className="border-b-4 border-ink">
            <div className="px-5 py-2 bg-soft border-b-2 border-ink flex justify-between items-baseline">
              <h2 className="text-2xl font-black tracking-tighter">{d.key === dateKey(now) ? 'TODAY' : fmtDay(d.from)}</h2>
              <span className="font-mono text-[11px] font-bold">
                {moon.name}
                {moon.springTide ? ' · BIG TIDES' : ''}
              </span>
            </div>
            <div className="px-3 pt-3">
              <TideChart curve={data.tides?.curve} hilo={data.tides?.hilo} from={d.from} to={d.to} now={now} height={130} />
            </div>
            <div className="grid grid-cols-4 border-y-2 border-ink font-mono text-center text-xs font-bold">
              {turns.map((p) => (
                <div key={p.t} className="py-2 border-r-2 border-ink last:border-r-0">
                  <div className="text-muted text-[10px]">{p.type === 'H' ? 'HIGH' : 'LOW'}</div>
                  <div>{fmtTime(p.t)}</div>
                  <div className="text-muted">{p.v.toFixed(1)} FT</div>
                </div>
              ))}
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 p-5 font-mono text-xs font-bold">
              <Row k="WIND" v={wind ? `${mainDir ?? ''} ${wind[0]}-${wind[1]} MPH` : '--'} />
              <Row k="GUSTS" v={gust ? `TO ${gust[1]} MPH` : '--'} />
              <Row k="WATER" v={water ? `${water[0]}-${water[1]}°F` : '--'} />
              <Row k="SURF" v={wave != null ? `TO ${wave.toFixed(1)} FT` : '--'} />
              <Row k="RAIN" v={rain ? `${rain[1]}% MAX` : '--'} />
              <Row k="SUN" v={sun ? `${fmtTime(sun.sunrise)} / ${fmtTime(sun.sunset)}` : '--'} />
            </dl>
            <div className="px-5 pb-5">
              <Label className="mb-2">BEST WINDOWS</Label>
              {dayWindows.length ? (
                <div className="border-2 border-ink divide-y-2 divide-ink">
                  {dayWindows.map((w) => (
                    <div key={w.start} className="flex items-center justify-between px-3 py-2 gap-3">
                      <div className="font-mono text-xs font-bold whitespace-nowrap">
                        {fmtHour(w.start)}-{fmtHour(w.end)}
                      </div>
                      <div className="flex-grow font-black text-sm truncate">{w.species.name}</div>
                      <Tag>{w.peak}</Tag>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="font-mono text-xs font-bold text-muted">NOTHING SCORES {WINDOW_THRESHOLD}+.</div>
              )}
              <HourStrip hours={hours} />
            </div>
          </section>
        )
      })}
      <div className="p-5 font-mono text-[11px] font-bold text-muted leading-relaxed">
        TIDES: NOAA PREDICTIONS (STATION 8659182). WIND, WATER TEMP & SURF: OPEN-METEO FORECAST MODELS. BEST WINDOWS ARE THE
        DAY'S TOP STRETCHES WHERE THE MATRIX SCORES {WINDOW_THRESHOLD}+. <Link to="/rigs" className="underline text-ink">RIG GUIDE →</Link>
      </div>
    </Screen>
  )
}

function Row({ k, v }) {
  return (
    <div className="flex justify-between border-b-2 border-faint pb-1">
      <dt className="text-muted">{k}</dt>
      <dd>{v}</dd>
    </div>
  )
}

/** Tiny hour-by-hour bite bar chart for the day. */
function HourStrip({ hours }) {
  if (!hours.length) return null
  return (
    <div className="mt-4" aria-label="Hourly bite score">
      <div className="flex items-end gap-px h-12">
        {hours.map((h) => (
          <div
            key={h.t}
            title={`${fmtHour(h.t)} ${h.rec?.species.short ?? ''} ${h.rec?.score ?? ''}`}
            className={`flex-1 ${h.rec?.score >= WINDOW_THRESHOLD ? 'bg-ink' : 'bg-faint'}`}
            style={{ height: `${Math.max(6, h.rec?.score ?? 0)}%` }}
          />
        ))}
      </div>
      <div className="flex justify-between font-mono text-[10px] font-bold text-muted mt-1">
        <span>{fmtHour(hours[0].t)}</span>
        <span>HOURLY BITE SCORE</span>
        <span>{fmtHour(hours.at(-1).t)}</span>
      </div>
    </div>
  )
}
