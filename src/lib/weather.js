// Open-Meteo: free, no API key, CORS-enabled.
// Weather (land point) gives wind / air temp / sun times.
// Marine (offshore point) gives real sea-surface temperature and waves.

const toMs = (s) => s * 1000
const cToF = (c) => (c * 9) / 5 + 32
const mToFt = (m) => m * 3.28084

async function getJson(url, signal) {
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`Open-Meteo HTTP ${res.status}`)
  const json = await res.json()
  if (json.error) throw new Error(`Open-Meteo: ${json.reason}`)
  return json
}

function zipHourly(h, map) {
  return (h?.time ?? []).map((t, i) => ({ t: toMs(t), ...map(i) }))
}

export async function fetchWeather({ lat, lng, signal }) {
  const params = new URLSearchParams({
    latitude: lat, longitude: lng,
    current: 'temperature_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m,weather_code',
    hourly: 'temperature_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m,precipitation_probability,weather_code',
    daily: 'sunrise,sunset',
    temperature_unit: 'fahrenheit', wind_speed_unit: 'mph',
    timezone: 'America/New_York', timeformat: 'unixtime',
    past_days: '1', forecast_days: '4',
  })
  const j = await getJson(`https://api.open-meteo.com/v1/forecast?${params}`, signal)
  const h = j.hourly
  return {
    current: j.current && {
      t: toMs(j.current.time),
      airF: j.current.temperature_2m,
      windMph: j.current.wind_speed_10m,
      windDeg: j.current.wind_direction_10m,
      gustMph: j.current.wind_gusts_10m,
      code: j.current.weather_code,
    },
    hourly: zipHourly(h, (i) => ({
      airF: h.temperature_2m[i],
      windMph: h.wind_speed_10m[i],
      windDeg: h.wind_direction_10m[i],
      gustMph: h.wind_gusts_10m[i],
      precipPct: h.precipitation_probability?.[i] ?? null,
      code: h.weather_code[i],
    })),
    daily: (j.daily?.time ?? []).map((t, i) => ({
      t: toMs(t),
      sunrise: toMs(j.daily.sunrise[i]),
      sunset: toMs(j.daily.sunset[i]),
    })),
  }
}

export async function fetchMarine({ lat, lng, signal }) {
  const params = new URLSearchParams({
    latitude: lat, longitude: lng,
    current: 'sea_surface_temperature,wave_height,wave_period,wave_direction',
    hourly: 'sea_surface_temperature,wave_height,wave_period',
    timezone: 'America/New_York', timeformat: 'unixtime',
    past_days: '1', forecast_days: '4',
  })
  const j = await getJson(`https://marine-api.open-meteo.com/v1/marine?${params}`, signal)
  // Convert whatever units come back into °F / ft.
  const tempF = (v, unit) => (v == null ? null : unit === '°F' ? v : cToF(v))
  const lenFt = (v, unit) => (v == null ? null : unit === 'ft' ? v : mToFt(v))
  const cu = j.current_units ?? {}
  const hu = j.hourly_units ?? {}
  const h = j.hourly
  return {
    current: j.current && {
      t: toMs(j.current.time),
      waterF: tempF(j.current.sea_surface_temperature, cu.sea_surface_temperature),
      waveFt: lenFt(j.current.wave_height, cu.wave_height),
      periodS: j.current.wave_period ?? null,
    },
    hourly: zipHourly(h, (i) => ({
      waterF: tempF(h.sea_surface_temperature?.[i], hu.sea_surface_temperature),
      waveFt: lenFt(h.wave_height?.[i], hu.wave_height),
      periodS: h.wave_period?.[i] ?? null,
    })),
  }
}

const DIRS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
export function compass(deg) {
  if (deg == null || Number.isNaN(deg)) return null
  return DIRS[Math.round((((deg % 360) + 360) % 360) / 45) % 8]
}

// WMO weather codes -> short labels
export function skyLabel(code) {
  if (code == null) return null
  if (code === 0) return 'CLEAR'
  if (code <= 2) return 'PARTLY CLOUDY'
  if (code === 3) return 'OVERCAST'
  if (code <= 48) return 'FOG'
  if (code <= 57) return 'DRIZZLE'
  if (code <= 67) return 'RAIN'
  if (code <= 77) return 'SNOW'
  if (code <= 82) return 'SHOWERS'
  if (code <= 86) return 'SNOW SHOWERS'
  return 'T-STORMS'
}
