import { useEffect, useState } from 'react'

/** Current time, re-rendering every `ms` so tide level and "best now" stay live. */
export function useNow(ms = 60 * 1000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms)
    const onVis = () => document.visibilityState === 'visible' && setNow(Date.now())
    document.addEventListener('visibilitychange', onVis)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [ms])
  return now
}
