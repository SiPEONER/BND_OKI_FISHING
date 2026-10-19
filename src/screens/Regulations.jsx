import { Link } from 'react-router'
import { SPECIES } from '../data/species.js'
import { REGS_META } from '../data/regulations.js'
import { bagText, isSeasonOpen, sizeText } from '../lib/regs.js'
import { Screen, Tag } from '../components/ui.jsx'
import { useNow } from '../hooks/useNow.js'

export default function Regulations() {
  const now = useNow()
  const list = SPECIES.filter((s) => s.reg)
  const closed = list.filter((s) => !isSeasonOpen(s.reg, now))

  return (
    <Screen title="NC LIMITS">
      <div className="p-4 border-b-4 border-ink bg-soft font-mono text-[11px] font-bold leading-relaxed">
        RECREATIONAL · COASTAL, JOINT & OCEAN WATERS · EFFECTIVE {REGS_META.effective}
        {closed.length > 0 && (
          <div className="mt-2 bg-ink text-paper px-2 py-1.5">
            CLOSED NOW: {closed.map((s) => s.name).join(', ')}. RELEASE THEM.
          </div>
        )}
      </div>

      {list.map((sp) => {
        const r = sp.reg
        const open = isSeasonOpen(r, now)
        return (
          <section key={sp.id} className="p-5 border-b-4 border-ink bg-paper">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h2 className="text-3xl font-black tracking-tighter leading-none">{sp.name}</h2>
              <Tag invert={open}>{open ? 'OPEN' : 'CLOSED'}</Tag>
            </div>
            {sp.aliases.length > 0 && <div className="font-mono text-[11px] font-bold text-muted mb-3">AKA {sp.aliases.join(' / ')}</div>}
            <div className="grid grid-cols-2 gap-4 my-3">
              <div>
                <span className="text-muted text-xs font-bold block mb-1">SIZE ({r.measure})</span>
                <span className="font-mono text-xl font-black">{sizeText(r)}</span>
              </div>
              <div>
                <span className="text-muted text-xs font-bold block mb-1">BAG LIMIT</span>
                <span className="font-mono text-xl font-black">{bagText(r)}</span>
              </div>
            </div>
            {r.notes.length > 0 && (
              <div className="bg-soft p-3 border-2 border-ink font-mono text-xs font-bold space-y-1">
                {r.notes.map((n) => (
                  <div key={n}>▸ {n}</div>
                ))}
              </div>
            )}
          </section>
        )
      })}

      <div className="p-5 font-mono text-[11px] font-bold leading-relaxed text-muted">
        SOURCE: {REGS_META.source}. LAST CHECKED {REGS_META.checked}. LIMITS CHANGE BY PROCLAMATION, SO CONFIRM BEFORE YOU
        KEEP A FISH. A COASTAL RECREATIONAL FISHING LICENSE IS REQUIRED.{' '}
        <a href={REGS_META.url} target="_blank" rel="noreferrer" className="underline text-ink">
          OPEN NCDMF LIMITS →
        </a>
        <div className="mt-3">
          THE LOG SCREEN CHECKS EACH FISH AGAINST THESE LIMITS.{' '}
          <Link to="/log/new" className="underline text-ink">
            LOG A CATCH →
          </Link>
        </div>
      </div>
    </Screen>
  )
}
