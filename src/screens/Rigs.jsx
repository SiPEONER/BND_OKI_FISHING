import { useEffect } from 'react'
import { useLocation } from 'react-router'
import { RIGS } from '../data/rigs.js'
import { SPECIES } from '../data/species.js'
import RigDiagram from '../components/RigDiagram.jsx'
import { Screen, Tag } from '../components/ui.jsx'

export default function Rigs() {
  const { hash } = useLocation()
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' })
  }, [hash])

  return (
    <Screen title="HOW-TO RIGS">
      <nav className="flex gap-2 overflow-x-auto p-3 border-b-4 border-ink bg-soft">
        {RIGS.map((r, i) => (
          <a key={r.id} href={`#${r.id}`} className="shrink-0 border-2 border-ink bg-paper px-2.5 py-1.5 font-mono text-[11px] font-bold">
            {i + 1}. {r.name}
          </a>
        ))}
      </nav>
      {RIGS.map((rig, index) => {
        const usedFor = SPECIES.filter((s) => s.profile?.rig === rig.id)
        return (
          <article key={rig.id} id={rig.id} className="p-5 border-b-4 border-ink bg-paper scroll-mt-16">
            <div className="flex items-center gap-3 mb-2">
              <span className="bg-ink text-paper font-mono font-black text-lg px-2.5 py-0.5">{index + 1}</span>
              <h2 className="text-2xl font-black tracking-tighter">{rig.name}</h2>
            </div>
            <Tag className="mb-4">{rig.target}</Tag>

            <div className="border-2 border-ink mb-4 overflow-hidden">
              {rig.image ? (
                <img src={rig.image} alt={`${rig.name} diagram`} className="themed-img w-full h-auto block" loading="lazy" />
              ) : (
                <RigDiagram type={rig.diagram} title={`${rig.name} diagram`} />
              )}
            </div>

            <div className="border-2 border-ink mb-4">
              <div className="bg-ink text-paper px-3 py-1 text-xs font-bold tracking-widest">PARTS</div>
              <ol className="divide-y-2 divide-ink">
                {rig.parts.map((part, i) => (
                  <li key={part.label} className="flex justify-between items-center gap-3 px-3 py-2 text-xs font-mono">
                    <span className="flex items-center gap-2">
                      <span className="w-5 h-5 shrink-0 bg-ink text-paper rounded-full flex items-center justify-center text-[10px] font-bold">
                        {i + 1}
                      </span>
                      <span className="font-bold">{part.label}</span>
                    </span>
                    <span className="text-muted font-semibold text-right">{part.spec}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="bg-soft p-4 border-2 border-ink mb-3">
              <span className="text-xs font-bold tracking-widest block mb-2 underline">HOW IT WORKS</span>
              <p className="font-mono text-xs leading-relaxed">{rig.howItWorks}</p>
            </div>
            {rig.tips?.length > 0 && (
              <ul className="font-mono text-xs leading-relaxed space-y-1 mb-3">
                {rig.tips.map((t) => (
                  <li key={t}>▸ {t}</li>
                ))}
              </ul>
            )}
            {usedFor.length > 0 && (
              <div className="font-mono text-[11px] font-bold text-muted">
                MATRIX USES IT FOR: {usedFor.map((s) => s.name).join(', ')}
              </div>
            )}
          </article>
        )
      })}
    </Screen>
  )
}
