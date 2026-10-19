import { Link } from 'react-router'
import { useBack } from '../hooks/useBack.js'

// Shared building blocks. Every screen is made from these, so the look stays
// consistent and a style change happens in exactly one place.

export function Screen({ title, back = true, backLabel = 'BACK', right, children, footer }) {
  return (
    <div className="max-w-md mx-auto min-h-dvh bg-paper text-ink border-x-4 border-ink flex flex-col font-sans uppercase">
      {title && <Header title={title} back={back} backLabel={backLabel} right={right} />}
      <main className="flex-grow flex flex-col">{children}</main>
      {footer && <div className="sticky bottom-0 z-10 p-4 bg-paper border-t-4 border-ink">{footer}</div>}
    </div>
  )
}

function Header({ title, back, backLabel, right }) {
  const goBack = useBack()
  return (
    <header className="border-b-4 border-ink px-4 py-3 grid grid-cols-[5rem_1fr_5rem] items-center bg-bar text-on-bar sticky top-0 z-20">
      <div>
        {back && (
          <button onClick={goBack} className="font-bold text-sm tracking-widest py-2 active:opacity-60">
            &lt; {backLabel}
          </button>
        )}
      </div>
      <h1 className="text-xl font-black tracking-tighter text-center truncate">{title}</h1>
      <div className="flex justify-end">{right}</div>
    </header>
  )
}

export function Section({ label, tone = 'paper', className = '', children, action }) {
  return (
    <section className={`p-5 border-b-4 border-ink ${tone === 'soft' ? 'bg-soft' : 'bg-paper'} ${className}`}>
      {(label || action) && (
        <div className="flex items-center justify-between mb-3 gap-2">
          {label && <Label>{label}</Label>}
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

export const Label = ({ children, className = '' }) => (
  <h2 className={`text-xs font-bold tracking-widest text-muted ${className}`}>{children}</h2>
)

const BTN = {
  primary: 'bg-ink text-paper border-4 border-ink font-black hover:bg-paper hover:text-ink',
  outline: 'bg-paper text-ink border-4 border-ink font-black hover:bg-ink hover:text-paper',
  ghost: 'bg-transparent text-ink border-2 border-ink font-bold hover:bg-ink hover:text-paper',
}
const SIZE = {
  xl: 'text-3xl py-5 w-full',
  md: 'text-sm py-4 w-full',
  sm: 'text-xs px-3 py-2',
}

export function Btn({ variant = 'outline', size = 'md', to, className = '', children, ...props }) {
  const cls = `${BTN[variant]} ${SIZE[size]} inline-flex items-center justify-center text-center tracking-tight transition-colors active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none ${className}`
  if (to) {
    return (
      <Link to={to} className={cls} {...props}>
        {children}
      </Link>
    )
  }
  return (
    <button type="button" className={cls} {...props}>
      {children}
    </button>
  )
}

/** Grid of mutually exclusive choices (species, bait, ...). */
export function Choice({ options, value, onChange, cols = 2, size = 'md', allowNone = false }) {
  const grid = { 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4' }[cols]
  return (
    <div className={`grid ${grid} gap-2`} role="radiogroup">
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(active && allowNone ? null : o.value)}
            className={`border-4 border-ink font-black transition-colors active:scale-[0.98] leading-tight ${
              size === 'sm' ? 'py-2.5 text-xs' : 'py-3.5 text-sm'
            } ${active ? 'bg-ink text-paper' : 'bg-paper text-ink hover:bg-soft'}`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

export function Stat({ label, value, sub, dim, className = '' }) {
  return (
    <div className={`p-4 flex flex-col items-center text-center ${className}`}>
      <span className="text-xs font-bold text-muted mb-1">{label}</span>
      <span className={`font-mono text-2xl font-black leading-tight ${dim ? 'text-faint' : ''}`}>{value}</span>
      {sub && <span className="font-mono text-[11px] font-bold text-muted mt-1">{sub}</span>}
    </div>
  )
}

export function Tag({ children, invert = false, className = '' }) {
  return (
    <span
      className={`inline-block font-mono text-[10px] font-bold px-2 py-1 tracking-wide ${
        invert ? 'bg-paper text-ink border-2 border-ink' : 'bg-ink text-paper'
      } ${className}`}
    >
      {children}
    </span>
  )
}

export function Empty({ title, children }) {
  return (
    <div className="p-8 text-center flex flex-col items-center gap-3">
      <div className="text-2xl font-black tracking-tighter">{title}</div>
      <div className="font-mono text-xs text-muted leading-relaxed max-w-xs">{children}</div>
    </div>
  )
}
