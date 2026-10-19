import { useRef, useState } from 'react'
import { SITE } from '../config.js'
import { REGS_META } from '../data/regulations.js'
import { catchStore, download, exportCSV, exportJSON, importCatches, useCatches } from '../lib/catchLog.js'
import { setTheme, spotStore, THEMES, useSettings, useSpots } from '../lib/settings.js'
import { dateKey } from '../lib/time.js'
import { Btn, Choice, Screen, Section } from '../components/ui.jsx'

export default function More() {
  const { theme } = useSettings()
  const catches = useCatches()
  const spots = useSpots()
  const fileRef = useRef(null)
  const [msg, setMsg] = useState(null)
  const [confirmWipe, setConfirmWipe] = useState(false)

  const stamp = () => dateKey(Date.now())
  const backup = () =>
    download(`oki-fishing-backup-${stamp()}.json`, JSON.stringify({ ...JSON.parse(exportJSON(catches)), spots }, null, 2), 'application/json')

  const onImport = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const json = JSON.parse(await file.text())
      const added = importCatches(json)
      let spotsAdded = 0
      if (Array.isArray(json.spots)) {
        spotStore.set((list) => {
          const ids = new Set(list.map((s) => s.id))
          const fresh = json.spots.filter((s) => s?.id && !ids.has(s.id) && typeof s.lat === 'number')
          spotsAdded = fresh.length
          return [...list, ...fresh]
        })
      }
      setMsg(`IMPORTED ${added} CATCHES${spotsAdded ? ` + ${spotsAdded} SPOTS` : ''}`)
    } catch (err) {
      setMsg(`IMPORT FAILED: ${String(err.message).toUpperCase()}`)
    }
  }

  return (
    <Screen title="MORE">
      <Section label="DISPLAY">
        <Choice cols={3} options={THEMES.map((t) => ({ value: t.id, label: t.label }))} value={theme} onChange={setTheme} />
        <p className="font-mono text-[11px] font-bold text-muted mt-2">RED MODE KEEPS YOUR NIGHT VISION ON THE BEACH.</p>
      </Section>

      <Section label={`YOUR DATA · ${catches.length} CATCHES · ${spots.length} SPOTS`} tone="soft">
        <p className="font-mono text-[11px] font-bold leading-relaxed mb-3">
          EVERYTHING IS STORED ON THIS PHONE ONLY. BACK IT UP NOW AND THEN, ESPECIALLY BEFORE CLEARING YOUR BROWSER OR
          SWITCHING PHONES.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Btn variant="primary" onClick={backup} disabled={!catches.length && !spots.length}>
            BACKUP (.JSON)
          </Btn>
          <Btn onClick={() => fileRef.current?.click()}>RESTORE</Btn>
          <Btn onClick={() => download(`oki-catches-${stamp()}.csv`, exportCSV(catches), 'text/csv')} disabled={!catches.length} className="col-span-2">
            EXPORT SPREADSHEET (.CSV)
          </Btn>
        </div>
        <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={onImport} />
        {msg && <p className="font-mono text-xs font-bold mt-3 bg-ink text-paper px-2 py-1.5">{msg}</p>}
      </Section>

      <Section label="INSTALL ON YOUR PHONE">
        <div className="font-mono text-xs font-bold leading-relaxed space-y-1">
          <p>▸ IPHONE: SAFARI → SHARE → ADD TO HOME SCREEN</p>
          <p>▸ ANDROID: CHROME → ⋮ MENU → INSTALL APP</p>
          <p className="text-muted">ONCE INSTALLED IT OPENS FULL-SCREEN AND WORKS WITH NO SIGNAL, USING THE LAST DATA IT SYNCED. TIDE PREDICTIONS STAY ACCURATE OFFLINE FOR 4 DAYS.</p>
        </div>
      </Section>

      <Section label="DATA SOURCES" tone="soft">
        <div className="font-mono text-[11px] font-bold leading-relaxed space-y-1">
          <p>▸ TIDES: NOAA CO-OPS, STATION {SITE.tideStation.id} ({SITE.tideStation.name})</p>
          <p>▸ WIND, AIR, SUN: OPEN-METEO FORECAST API</p>
          <p>▸ WATER TEMP & SURF: OPEN-METEO MARINE API (MODEL, NEAREST OFFSHORE CELL)</p>
          <p>▸ SATELLITE: ESRI WORLD IMAGERY</p>
          <p>▸ LIMITS: NCDMF, EFFECTIVE {REGS_META.effective}</p>
          <p className="text-muted pt-1">NOT FOR NAVIGATION. CONDITIONS ARE FORECASTS, NOT GUARANTEES.</p>
        </div>
      </Section>

      <Section label="DANGER ZONE">
        {confirmWipe ? (
          <div className="grid grid-cols-2 gap-2">
            <Btn onClick={() => setConfirmWipe(false)}>CANCEL</Btn>
            <Btn
              variant="primary"
              onClick={() => {
                catchStore.set([])
                spotStore.set([])
                setConfirmWipe(false)
                setMsg('LOG AND SPOTS CLEARED')
              }}
            >
              ERASE ALL
            </Btn>
          </div>
        ) : (
          <Btn variant="ghost" onClick={() => setConfirmWipe(true)} disabled={!catches.length && !spots.length}>
            ERASE MY LOG & SPOTS
          </Btn>
        )}
      </Section>

      <div className="p-5 font-mono text-[11px] font-bold text-muted text-center">
        {SITE.brand} :: {SITE.name} · {SITE.version}
      </div>
    </Screen>
  )
}
