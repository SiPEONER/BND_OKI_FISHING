// Line-art diagrams for rigs that don't have an illustration, drawn in the
// same numbered-callout style as the original rig images.

function Callout({ x, y, n, lineTo }) {
  return (
    <g>
      <line x1={x} x2={x} y1={y + 18} y2={lineTo} stroke="currentColor" strokeWidth="2" />
      <circle cx={x} cy={y} r="17" fill="currentColor" />
      <text x={x} y={y + 6.5} textAnchor="middle" fontSize="19" fontWeight="900" fontFamily="var(--font-mono)" fill="var(--soft)">
        {n}
      </text>
    </g>
  )
}

const Knot = ({ x, y }) => (
  <g stroke="currentColor" strokeWidth="2" fill="none">
    <path d={`M${x - 8},${y - 5} l6,10 M${x - 2},${y - 5} l6,10 M${x + 4},${y - 5} l6,10`} />
  </g>
)

function Spoon() {
  const y = 120
  return (
    <>
      <line x1="30" x2="246" y1={y} y2={y} stroke="currentColor" strokeWidth="2.5" />
      <Knot x={90} y={y} />
      {/* ball-bearing swivel */}
      <g stroke="currentColor" strokeWidth="3" fill="none">
        <circle cx="254" cy={y} r="8" />
        <rect x="262" y={y - 8} width="22" height="16" rx="4" fill="currentColor" />
        <circle cx="292" cy={y} r="8" />
      </g>
      <line x1="300" x2="430" y1={y} y2={y} stroke="currentColor" strokeWidth="2" strokeDasharray="1 0" />
      {/* split ring + spoon */}
      <circle cx="438" cy={y} r="7" stroke="currentColor" strokeWidth="3" fill="none" />
      <path d={`M445,${y} C470,${y - 34} 540,${y - 30} 556,${y} C540,${y + 30} 470,${y + 34} 445,${y} Z`} fill="currentColor" />
      <path d={`M462,${y - 6} C490,${y - 20} 520,${y - 18} 536,${y - 6}`} stroke="var(--soft)" strokeWidth="3" fill="none" />
      {/* treble hook */}
      <g stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round">
        <line x1="556" x2="574" y1={y} y2={y} />
        <path d={`M574,${y} q14,-2 10,-18 l-6,5`} />
        <path d={`M574,${y} q14,2 10,18 l-6,-5`} />
      </g>
      <Callout x={90} y={40} n={1} lineTo={y - 10} />
      <Callout x={273} y={40} n={2} lineTo={y - 14} />
      <Callout x={370} y={40} n={3} lineTo={y - 8} />
      <Callout x={500} y={40} n={4} lineTo={y - 30} />
    </>
  )
}

function Cork() {
  const y = 95
  return (
    <>
      <line x1="30" x2="200" y1={y} y2={y} stroke="currentColor" strokeWidth="2.5" />
      <Knot x={90} y={y} />
      {/* popping cork: concave face + body + stem */}
      <line x1="196" x2="320" y1={y} y2={y} stroke="currentColor" strokeWidth="3" />
      <path d={`M214,${y - 22} Q206,${y} 214,${y + 22} L292,${y + 12} Q298,${y} 292,${y - 12} Z`} fill="currentColor" />
      <circle cx="304" cy={y} r="5" fill="currentColor" />
      <circle cx="316" cy={y} r="5" fill="currentColor" />
      {/* leader hanging down to the hook */}
      <path d={`M322,${y} C380,${y + 10} 420,${y + 60} 440,${y + 110}`} stroke="currentColor" strokeWidth="2" fill="none" />
      <Knot x={442} y={y + 112} />
      <g stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round">
        <path d={`M446,${y + 118} q4,30 30,30 q26,0 26,-26 l-9,6`} />
      </g>
      {/* shrimp silhouette */}
      <path d={`M478,${y + 128} q18,-12 36,-2 q-6,10 -20,12 q-10,2 -16,-10 z`} fill="currentColor" opacity="0.55" />
      <Callout x={90} y={30} n={1} lineTo={y - 10} />
      <Callout x={252} y={30} n={2} lineTo={y - 26} />
      <Callout x={392} y={30} n={3} lineTo={y + 34} />
      <Callout x={496} y={60} n={4} lineTo={y + 112} />
    </>
  )
}

const DIAGRAMS = { spoon: Spoon, cork: Cork }

export default function RigDiagram({ type, title }) {
  const D = DIAGRAMS[type]
  if (!D) return null
  return (
    <svg viewBox="0 0 600 260" className="w-full h-auto block bg-soft text-ink" role="img" aria-label={title}>
      <D />
    </svg>
  )
}
