import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { MapContainer, Marker, Popup, TileLayer, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { SITE } from '../config.js'
import { ZONES } from '../data/zones.js'
import { addSpot, removeSpot, renameSpot, useSpots } from '../lib/settings.js'
import { Btn, Label, Screen } from '../components/ui.jsx'
import { useReports } from '../lib/community.js'
import { summarize } from '../lib/communityStats.js'
import { speciesById } from '../data/species.js'
import { useNow } from '../hooks/useNow.js'

const IMAGERY = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
const LABELS = 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}'
const ATTRIBUTION = 'Imagery &copy; Esri, Maxar, Earthstar Geographics'

const zoneIcon = (id) => L.divIcon({ className: '', html: `<div class="zone-pin" style="width:34px;height:34px">${id}</div>`, iconSize: [34, 34], iconAnchor: [17, 17] })
const spotIcon = L.divIcon({ className: '', html: '<div class="spot-pin" style="width:28px;height:28px">★</div>', iconSize: [28, 28], iconAnchor: [14, 14] })
const meIcon = L.divIcon({ className: '', html: '<div class="me-pin"></div>', iconSize: [18, 18], iconAnchor: [9, 9] })

function ClickToDrop({ active, onDrop }) {
  useMapEvents({ click: (e) => active && onDrop(e.latlng) })
  return null
}

export default function MapScreen() {
  const [params] = useSearchParams()
  const spots = useSpots()
  const [map, setMap] = useState(null)
  const [mono, setMono] = useState(true)
  const [dropping, setDropping] = useState(false)
  const [draft, setDraft] = useState(null) // { lat, lng, name }
  const [me, setMe] = useState(null)
  const [geoError, setGeoError] = useState(null)
  const markers = useRef({})
  const feed = useReports()
  const now = useNow()
  const activity = useMemo(() => new Map(summarize(feed.reports, now, 24).zones.map((z) => [z.zoneId, z])), [feed.reports, now])

  const focus = (key, lat, lng) => {
    if (!map) return
    map.flyTo([lat, lng], 15, { duration: 0.8 })
    setTimeout(() => markers.current[key]?.openPopup(), 850)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const zoneParam = params.get('zone')
  useEffect(() => {
    const z = ZONES.find((x) => x.id === zoneParam)
    if (map && z) {
      map.setView([z.lat, z.lng], 15)
      setTimeout(() => markers.current[`Z${z.id}`]?.openPopup(), 300)
    }
  }, [map, zoneParam])

  const locate = () => {
    setGeoError(null)
    if (!navigator.geolocation) return setGeoError('LOCATION NOT AVAILABLE')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setMe(p)
        map?.flyTo([p.lat, p.lng], 16)
      },
      () => setGeoError('LOCATION BLOCKED OR UNAVAILABLE'),
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  const saveDraft = () => {
    addSpot(draft)
    setDraft(null)
    setDropping(false)
  }

  const bounds = useMemo(() => L.latLngBounds([33.86, -78.30], [33.97, -77.98]), [])

  return (
    <Screen
      title="LIVE SATELLITE"
      right={
        <button onClick={() => setMono((m) => !m)} className="font-mono text-[10px] font-bold border-2 border-on-bar px-1.5 py-1">
          {mono ? 'COLOR' : 'MONO'}
        </button>
      }
    >
      <div className={`relative h-[58dvh] min-h-80 border-b-4 border-ink ${mono ? 'map-tiles-mono' : ''}`}>
        <MapContainer
          center={SITE.map.center}
          zoom={SITE.map.zoom}
          minZoom={10}
          maxBounds={bounds.pad(1)}
          ref={setMap}
          className="absolute inset-0"
          zoomControl={false}
          attributionControl
        >
          <TileLayer url={IMAGERY} attribution={ATTRIBUTION} maxZoom={19} maxNativeZoom={18} />
          <TileLayer url={LABELS} maxZoom={19} maxNativeZoom={18} />
          <ClickToDrop active={dropping} onDrop={(ll) => setDraft({ lat: ll.lat, lng: ll.lng, name: '' })} />
          {ZONES.map((z) => (
            <Marker key={z.id} position={[z.lat, z.lng]} icon={zoneIcon(z.id)} ref={(m) => (markers.current[`Z${z.id}`] = m)}>
              <Popup>
                <div className="font-sans uppercase">
                  <div className="font-black text-sm">
                    ZONE {z.id} :: {z.name}
                  </div>
                  <div className="font-mono text-[11px] font-bold text-gray-500">{z.area}</div>
                  <div className="font-mono text-[11px] mt-1">{z.blurb}</div>
                  {activity.get(z.id) && (
                    <div className="font-mono text-[11px] font-bold mt-1 bg-black text-white px-1.5 py-0.5">
                      LAST 24H: {activity.get(z.id).count} REPORT{activity.get(z.id).count > 1 ? 'S' : ''}
                      {activity.get(z.id).topSpecies && ` · ${speciesById(activity.get(z.id).topSpecies)?.short} BITING`}
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
          {spots.map((s) => (
            <Marker key={s.id} position={[s.lat, s.lng]} icon={spotIcon} ref={(m) => (markers.current[`S${s.id}`] = m)}>
              <Popup>
                <div className="font-sans uppercase font-black text-sm">★ {s.name}</div>
                <div className="font-mono text-[11px] text-gray-500">
                  {s.lat.toFixed(5)}, {s.lng.toFixed(5)}
                </div>
              </Popup>
            </Marker>
          ))}
          {draft && <Marker position={[draft.lat, draft.lng]} icon={spotIcon} />}
          {me && <Marker position={[me.lat, me.lng]} icon={meIcon} />}
        </MapContainer>

        <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-2">
          <MapBtn onClick={() => map?.zoomIn()} label="Zoom in">+</MapBtn>
          <MapBtn onClick={() => map?.zoomOut()} label="Zoom out">−</MapBtn>
          <MapBtn onClick={locate} label="Show my location">◎</MapBtn>
          <MapBtn onClick={() => map?.flyTo(SITE.map.center, SITE.map.zoom)} label="Whole island">⌂</MapBtn>
        </div>
        {dropping && !draft && (
          <div className="absolute top-3 left-3 right-16 z-[1000] bg-ink text-paper font-mono text-xs font-bold p-2 border-2 border-paper">
            TAP THE MAP TO DROP YOUR PIN
          </div>
        )}
      </div>

      {draft ? (
        <section className="p-5 border-b-4 border-ink bg-soft">
          <Label className="mb-2">NAME THIS SPOT</Label>
          <input
            autoFocus
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && saveDraft()}
            placeholder="E.G. THE GOOD HOLE"
            className="w-full border-4 border-ink bg-paper p-3 font-black uppercase mb-3 placeholder:text-faint"
          />
          <div className="grid grid-cols-2 gap-2">
            <Btn onClick={() => setDraft(null)}>CANCEL</Btn>
            <Btn variant="primary" onClick={saveDraft}>
              SAVE SPOT
            </Btn>
          </div>
        </section>
      ) : (
        <div className="p-4 border-b-4 border-ink grid grid-cols-1">
          <Btn variant={dropping ? 'primary' : 'outline'} onClick={() => setDropping((d) => !d)}>
            {dropping ? 'CANCEL PIN DROP' : '+ DROP A PIN ON MY SPOT'}
          </Btn>
          {geoError && <p className="font-mono text-[11px] font-bold mt-2">{geoError}</p>}
        </div>
      )}

      <section className="p-5 border-b-4 border-ink">
        <Label className="mb-3">OKI TACTICAL ZONES</Label>
        <div className="space-y-2">
          {ZONES.map((z) => (
            <button
              key={z.id}
              onClick={() => focus(`Z${z.id}`, z.lat, z.lng)}
              className="w-full flex items-center justify-between border-b-2 border-ink pb-2 text-left active:bg-soft"
            >
              <span className="font-bold text-sm">
                ZONE {z.id} <span className="tracking-widest">::</span> {z.name}
              </span>
              <span className="font-mono text-[11px]">{z.area}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="p-5">
        <Label className="mb-3">MY SPOTS ({spots.length})</Label>
        {spots.length === 0 ? (
          <p className="font-mono text-xs text-muted">NO SPOTS YET. DROP A PIN TO SAVE ONE. SPOTS STAY PRIVATE ON THIS PHONE.</p>
        ) : (
          <div className="space-y-2">
            {spots.map((s) => (
              <SpotRow key={s.id} spot={s} onFocus={() => focus(`S${s.id}`, s.lat, s.lng)} />
            ))}
          </div>
        )}
      </section>
    </Screen>
  )
}

function SpotRow({ spot, onFocus }) {
  const [mode, setMode] = useState(null) // 'rename' | 'delete'
  const [name, setName] = useState(spot.name)
  if (mode === 'rename') {
    return (
      <div className="flex gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} className="flex-grow border-2 border-ink bg-paper p-2 font-bold uppercase" />
        <Btn size="sm" variant="primary" onClick={() => (renameSpot(spot.id, name), setMode(null))}>
          OK
        </Btn>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-2 border-b-2 border-ink pb-2">
      <button onClick={onFocus} className="flex-grow text-left font-bold text-sm">
        ★ {spot.name}
      </button>
      {mode === 'delete' ? (
        <>
          <Btn size="sm" onClick={() => setMode(null)}>NO</Btn>
          <Btn size="sm" variant="primary" onClick={() => removeSpot(spot.id)}>
            DELETE
          </Btn>
        </>
      ) : (
        <>
          <Btn size="sm" variant="ghost" onClick={() => setMode('rename')}>
            RENAME
          </Btn>
          <Btn size="sm" variant="ghost" onClick={() => setMode('delete')}>
            ✕
          </Btn>
        </>
      )}
    </div>
  )
}

function MapBtn({ onClick, label, children }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="w-11 h-11 bg-ink text-paper border-2 border-paper font-black text-xl flex items-center justify-center active:scale-95"
    >
      {children}
    </button>
  )
}
