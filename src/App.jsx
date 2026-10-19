import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router'
import { applyTheme, useSettings } from './lib/settings.js'
import Dashboard from './screens/Dashboard.jsx'
import LogCatch from './screens/LogCatch.jsx'
import CatchLog from './screens/CatchLog.jsx'
import Rigs from './screens/Rigs.jsx'
import Regulations from './screens/Regulations.jsx'
import Forecast from './screens/Forecast.jsx'
import More from './screens/More.jsx'
import { Empty, Screen } from './components/ui.jsx'

// Leaflet is the heaviest dependency: only load it when the map is opened.
const MapScreen = lazy(() => import('./screens/MapScreen.jsx'))

function ScrollToTop() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (!hash) window.scrollTo(0, 0)
  }, [pathname, hash])
  return null
}

function ThemeSync() {
  const { theme } = useSettings()
  useEffect(() => applyTheme(theme), [theme])
  return null
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeSync />
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/log" element={<CatchLog />} />
        <Route path="/log/new" element={<LogCatch />} />
        <Route path="/log/:id" element={<LogCatch />} />
        <Route path="/forecast" element={<Forecast />} />
        <Route path="/rigs" element={<Rigs />} />
        <Route path="/regs" element={<Regulations />} />
        <Route
          path="/map"
          element={
            <Suspense fallback={<Screen title="LIVE SATELLITE"><Empty title="LOADING MAP..." /></Screen>}>
              <MapScreen />
            </Suspense>
          }
        />
        <Route path="/more" element={<More />} />
        <Route path="*" element={<Screen title="404"><Empty title="NOTHING HERE">THAT PAGE DOESN'T EXIST.</Empty></Screen>} />
      </Routes>
    </BrowserRouter>
  )
}
