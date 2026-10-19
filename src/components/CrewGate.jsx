import { useState } from 'react'
import { checkCrew, setCrew } from '../lib/community.js'
import { Btn, Section } from './ui.jsx'

/** Asks for the crew code once; saved on the phone after the server accepts it. */
export default function CrewGate({ compact = false }) {
  const [code, setCode] = useState('')
  const [state, setState] = useState({ busy: false, error: null })

  const submit = async () => {
    setState({ busy: true, error: null })
    try {
      const ok = await checkCrew(code)
      if (ok) setCrew(code)
      setState({ busy: false, error: ok ? null : "THAT'S NOT THE CODE" })
    } catch (e) {
      setState({ busy: false, error: navigator.onLine ? String(e.message).toUpperCase() : 'NEED SIGNAL TO CHECK THE CODE' })
    }
  }

  return (
    <Section label="CREW CODE" tone={compact ? 'paper' : 'soft'}>
      {!compact && (
        <p className="font-mono text-xs font-bold leading-relaxed mb-3">
          ANYONE CAN READ REPORTS. POSTING NEEDS THE CREW CODE SHARED IN THE OKI FISHING GROUP. KEEPS IT LOCAL.
        </p>
      )}
      <div className="flex gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === 'Enter' && code && submit()}
          placeholder="ENTER CODE"
          autoCapitalize="characters"
          className="flex-grow min-w-0 border-4 border-ink bg-paper p-3 font-black uppercase placeholder:text-faint"
        />
        <Btn variant="primary" size="sm" className="!px-5" onClick={submit} disabled={!code || state.busy}>
          {state.busy ? '...' : 'UNLOCK'}
        </Btn>
      </div>
      {state.error && <p className="mt-2 font-mono text-xs font-bold">{state.error}</p>}
    </Section>
  )
}
