import { useMemo } from 'react'
import { fmtHour, fmtTime, localParts, HOUR } from '../lib/time.js'

const W = 400

/**
 * Tide curve between `from` and `to` with high/low labels and a NOW marker.
 * Pure SVG in ink/paper so it themes with the rest of the app.
 */
export default function TideChart({ curve, hilo, from, to, now, height = 140, labels = true, dayTicks = false }) {
  const H = height
  const padTop = labels ? 30 : 8
  const padBot = 18

  const model = useMemo(() => {
    const pts = (curve ?? []).filter((p) => p.t >= from - HOUR && p.t <= to + HOUR)
    if (pts.length < 2) return null
    const vals = pts.map((p) => p.v)
    const lo = Math.min(...vals) - 0.3
    const hi = Math.max(...vals) + 0.3
    const x = (t) => ((t - from) / (to - from)) * W
    const y = (v) => padTop + (1 - (v - lo) / (hi - lo)) * (H - padTop - padBot)
    const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`).join('')
    const area = `${line}L${x(pts.at(-1).t).toFixed(1)},${H - padBot}L${x(pts[0].t).toFixed(1)},${H - padBot}Z`
    const turns = (hilo ?? []).filter((p) => p.t >= from && p.t <= to)

    const ticks = []
    const step = dayTicks ? 24 * HOUR : 6 * HOUR
    let t = Math.ceil(from / HOUR) * HOUR
    while (t <= to) {
      const { hour } = localParts(t)
      if (dayTicks ? hour === 0 : hour % 6 === 0) ticks.push(t)
      t += HOUR
    }
    return { x, y, line, area, turns, ticks, step, lo }
  }, [curve, hilo, from, to, H, padTop, dayTicks])

  if (!model) {
    return (
      <div className="font-mono text-xs text-muted text-center py-8 border-2 border-dashed border-faint">
        NO TIDE DATA
      </div>
    )
  }
  const { x, y, line, area, turns, ticks } = model
  const nowX = now != null && now >= from && now <= to ? x(now) : null

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto block text-ink" role="img" aria-label="Tide chart">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={x(t)} x2={x(t)} y1={padTop - 6} y2={H - padBot} stroke="var(--faint)" strokeWidth="1" />
          <text x={x(t)} y={H - 5} textAnchor="middle" fontSize="10" fontFamily="var(--font-mono)" fontWeight="700" fill="var(--muted)">
            {dayTicks ? localParts(t).weekday : fmtHour(t)}
          </text>
        </g>
      ))}
      <path d={area} fill="var(--soft)" />
      <path d={line} fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
      <line x1="0" x2={W} y1={H - padBot} y2={H - padBot} stroke="currentColor" strokeWidth="2" />
      {turns.map((p) => {
        const px = Math.min(Math.max(x(p.t), 22), W - 22)
        const py = y(p.v)
        return (
          <g key={p.t}>
            <rect x={x(p.t) - 4} y={py - 4} width="8" height="8" fill={p.type === 'H' ? 'currentColor' : 'var(--paper)'} stroke="currentColor" strokeWidth="2" />
            {labels && (
              <text
                x={px}
                y={py - 10}
                textAnchor="middle"
                fontSize="10"
                fontWeight="800"
                fontFamily="var(--font-mono)"
                fill="currentColor"
              >
                {p.type} {fmtTime(p.t).replace(' ', '')}
              </text>
            )}
          </g>
        )
      })}
      {nowX != null && (
        <g>
          <line x1={nowX} x2={nowX} y1={padTop - 10} y2={H - padBot} stroke="currentColor" strokeWidth="2" strokeDasharray="4 3" />
          <rect x={nowX - 16} y={0} width="32" height="14" fill="currentColor" />
          <text x={nowX} y={10.5} textAnchor="middle" fontSize="9" fontWeight="900" fontFamily="var(--font-mono)" fill="var(--paper)">
            NOW
          </text>
        </g>
      )}
    </svg>
  )
}
