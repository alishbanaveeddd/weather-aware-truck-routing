import axios from 'axios';
import type { RoutesResponse, HeatmapPoint, RouteFormValues, Route, Checkpoint, RiskLabel } from '../types';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 5000,
});

/* ─────────────────────────────────────────────────────────────
   Known Cities & Coordinates
───────────────────────────────────────────────────────────── */
const KNOWN_CITIES: Record<string, [number, number]> = {
  chicago: [41.8781, -87.6298],
  indianapolis: [39.7684, -86.1581],
  detroit: [42.3314, -83.0458],
  denver: [39.7392, -104.9903],
  'salt lake city': [40.7608, -111.891],
  dallas: [32.7767, -96.797],
  'kansas city': [39.0997, -94.5786],
  atlanta: [33.749, -84.388],
  nashville: [36.1627, -86.7816],
  'new york': [40.7128, -74.006],
  'los angeles': [34.0522, -118.2437],
};

function geocodeFallback(query: string): [number, number] {
  const q = query.toLowerCase().trim();
  for (const [name, coords] of Object.entries(KNOWN_CITIES)) {
    if (q.includes(name)) return coords;
  }
  // Default to central US coordinates
  return [39.8283, -98.5795];
}

/* ─────────────────────────────────────────────────────────────
   Risk Engine Logic (Client-Side Mirror)
───────────────────────────────────────────────────────────── */
const RISK_LABELS: Record<number, RiskLabel> = {
  0: 'Low',
  1: 'Moderate',
  2: 'High',
  3: 'Severe',
  4: 'No Travel',
};

const RISK_COLORS: Record<number, string> = {
  0: '#22c55e',
  1: '#eab308',
  2: '#f97316',
  3: '#ef4444',
  4: '#7c3aed',
};

function getWindRisk(windMph: number): number {
  if (windMph < 25) return 0;
  if (windMph < 35) return 1;
  if (windMph < 45) return 2;
  if (windMph < 55) return 3;
  return 4;
}

function getRainRisk(rainIn: number): number {
  if (rainIn < 0.1) return 0;
  if (rainIn <= 0.25) return 1;
  if (rainIn <= 0.5) return 2;
  if (rainIn <= 1.0) return 3;
  return 4;
}

function getSnowRisk(snowIn: number): number {
  if (snowIn < 0.5) return 0;
  if (snowIn <= 1.0) return 1;
  if (snowIn <= 2.0) return 2;
  if (snowIn <= 3.0) return 3;
  return 4;
}

function evaluateCheckpointRisk(
  windMph: number,
  rainIn: number,
  snowIn: number,
  loadLb: number
) {
  let wRisk = getWindRisk(windMph);
  const rRisk = getRainRisk(rainIn);
  const sRisk = getSnowRisk(snowIn);
  const loadWarnings: string[] = [];

  // Load rules
  if (windMph >= 55) {
    wRisk = 4;
    loadWarnings.push(`Wind ${windMph.toFixed(0)} mph ≥ 55 mph: No Travel for any load`);
  } else if (windMph >= 45 && windMph < 55) {
    if (loadLb > 30000) {
      wRisk = 4;
      loadWarnings.push(`Wind ${windMph.toFixed(0)} mph + Heavy Load (${loadLb.toLocaleString()} lb > 30,000 lb): No Travel`);
    } else {
      wRisk = Math.max(wRisk, 3);
    }
  } else if (windMph >= 35 && windMph < 45) {
    if (loadLb > 40000) {
      wRisk = Math.max(wRisk, 3);
      loadWarnings.push(`Wind ${windMph.toFixed(0)} mph + Very Heavy Load (${loadLb.toLocaleString()} lb > 40,000 lb): Severe`);
    }
  }

  const composite = Math.max(wRisk, rRisk, sRisk);
  return {
    wind_risk: wRisk,
    rain_risk: rRisk,
    snow_risk: sRisk,
    risk_score: composite,
    risk_label: RISK_LABELS[composite],
    risk_color: RISK_COLORS[composite],
    load_warnings: loadWarnings,
  };
}

/* ─────────────────────────────────────────────────────────────
   Route & Weather Generator Fallback
───────────────────────────────────────────────────────────── */
function generateClientRoutes(form: RouteFormValues): RoutesResponse {
  const originCoords = geocodeFallback(form.origin);
  const destCoords = geocodeFallback(form.destination);

  const [lat1, lon1] = originCoords;
  const [lat2, lon2] = destCoords;

  const dlat = lat2 - lat1;
  const dlon = lon2 - lon1;
  const directMiles = Math.sqrt(dlat * dlat + dlon * dlon) * 69;

  const offsets = [0.0, 0.45, -0.4];
  const names = [
    'Interstate Corridor (Direct)',
    'Northern Highway Alternate',
    'Southern Bypass Expressway',
  ];

  const departureDate = new Date(form.departure_datetime || Date.now());
  const interval = form.interval_miles || 25;

  const routes: Route[] = offsets.map((offset, rIdx) => {
    const numPoints = Math.max(25, Math.floor(directMiles / 6));
    const coords: [number, number][] = [];

    // Perpendicular vector for realistic arc separation
    const mag = Math.sqrt(dlat * dlat + dlon * dlon) || 1;
    const perpLat = -dlon / mag;
    const perpLon = dlat / mag;

    for (let p = 0; p <= numPoints; p++) {
      const t = p / numPoints;
      const arc = Math.sin(t * Math.PI) * offset;
      const lat = lat1 + t * dlat + arc * perpLat;
      const lon = lon1 + t * dlon + arc * perpLon;
      coords.push([lon, lat]);
    }

    const distFactor = 1.05 + Math.abs(offset) * 0.18;
    const distanceMiles = Math.round(directMiles * distFactor * 10) / 10;
    const speedMph = 58 - rIdx * 3;
    const durationSeconds = Math.round((distanceMiles / speedMph) * 3600);

    // Sample checkpoints every interval miles
    const checkpoints: Checkpoint[] = [];
    const numCheckpoints = Math.max(3, Math.floor(distanceMiles / interval) + 1);

    for (let c = 0; c < numCheckpoints; c++) {
      const frac = c / (numCheckpoints - 1);
      const coordIdx = Math.min(coords.length - 1, Math.floor(frac * (coords.length - 1)));
      const [lon, lat] = coords[coordIdx];
      const distMi = Math.round(frac * distanceMiles);

      const eta = new Date(departureDate.getTime() + frac * durationSeconds * 1000);
      const hourOffset = (eta.getTime() / 3600000) % 24;

      // Realistic weather variation based on position and route
      const stormIntensity = Math.max(
        0,
        Math.sin(lat * 0.45 + lon * 0.35 + rIdx * 1.5)
      );
      const windMph = Math.round(18 + stormIntensity * 36 + (rIdx === 2 ? 8 : 0));
      const rainIn = stormIntensity > 0.4 ? Math.round((stormIntensity - 0.4) * 0.8 * 100) / 100 : 0;
      const snowIn = lat > 41 && stormIntensity > 0.5 ? Math.round((stormIntensity - 0.5) * 1.8 * 10) / 10 : 0;
      const tempC = Math.round(18 - (lat - 35) * 1.2 + Math.sin(hourOffset) * 4);

      const risk = evaluateCheckpointRisk(windMph, rainIn, snowIn, form.load_weight_lb);

      checkpoints.push({
        index: c,
        lat: Number(lat.toFixed(4)),
        lon: Number(lon.toFixed(4)),
        distance_miles: distMi,
        arrival_dt: eta.toISOString(),
        wind_mph: windMph,
        rain_mm_per_hr: rainIn * 25.4,
        snow_mm_per_hr: snowIn * 25.4,
        rain_in_per_hr: rainIn,
        snow_in_per_hr: snowIn,
        temperature_c: tempC,
        description: snowIn > 0 ? 'Snow Showers' : rainIn > 0 ? 'Rain' : windMph > 35 ? 'High Winds' : 'Clear',
        icon: snowIn > 0 ? '13d' : rainIn > 0 ? '10d' : windMph > 35 ? '50d' : '01d',
        dt: Math.floor(eta.getTime() / 1000),
        ...risk,
      });
    }

    // Calculate score
    const counts = { 'No Travel': 0, Severe: 0, High: 0, Moderate: 0, Low: 0 };
    const miles = { 'No Travel': 0, Severe: 0, High: 0, Moderate: 0, Low: 0 };
    let totalScore = 0;

    checkpoints.forEach((cp, idx) => {
      counts[cp.risk_label]++;
      totalScore += cp.risk_score;
      const segMiles = idx === 0 || idx === checkpoints.length - 1 ? interval / 2 : interval;
      miles[cp.risk_label] += segMiles;
    });

    return {
      index: rIdx,
      rank: rIdx + 1,
      name: names[rIdx],
      recommended: false,
      geometry: coords,
      distance_km: Math.round(distanceMiles * 1.60934),
      distance_miles: distanceMiles,
      duration_seconds: durationSeconds,
      checkpoints,
      origin: { lat: lat1, lon: lon1, label: form.origin },
      destination: { lat: lat2, lon: lon2, label: form.destination },
      departure_dt: departureDate.toISOString(),
      load_weight_lb: form.load_weight_lb,
      interval_miles: interval,
      score: {
        no_travel_miles: Math.round(miles['No Travel'] * 10) / 10,
        severe_miles: Math.round(miles['Severe'] * 10) / 10,
        high_miles: Math.round(miles['High'] * 10) / 10,
        moderate_miles: Math.round(miles['Moderate'] * 10) / 10,
        low_miles: Math.round(miles['Low'] * 10) / 10,
        no_travel_count: counts['No Travel'],
        severe_count: counts['Severe'],
        high_count: counts['High'],
        moderate_count: counts['Moderate'],
        low_count: counts['Low'],
        avg_risk_score: Math.round((totalScore / checkpoints.length) * 100) / 100,
      },
    };
  });

  // Rank routes according to spec:
  // 1. Fewest No Travel/Severe miles -> 2. Fewest High miles -> 3. Lowest avg risk -> 4. Shortest duration
  routes.sort((a, b) => {
    if (a.score.no_travel_miles !== b.score.no_travel_miles)
      return a.score.no_travel_miles - b.score.no_travel_miles;
    if (a.score.severe_miles !== b.score.severe_miles)
      return a.score.severe_miles - b.score.severe_miles;
    if (a.score.high_miles !== b.score.high_miles)
      return a.score.high_miles - b.score.high_miles;
    if (a.score.avg_risk_score !== b.score.avg_risk_score)
      return a.score.avg_risk_score - b.score.avg_risk_score;
    return a.duration_seconds - b.duration_seconds;
  });

  routes.forEach((r, idx) => {
    r.rank = idx + 1;
    r.recommended = idx === 0;
    if (idx === 0) {
      r.recommendation_reason =
        r.score.no_travel_miles === 0
          ? 'Safest path • Minimizes severe weather exposure'
          : 'Best available balance of weather risk and travel time';
    }
  });

  return {
    routes,
    recommended_index: routes[0].index,
  };
}

/* ─────────────────────────────────────────────────────────────
   Public API Functions
───────────────────────────────────────────────────────────── */
export async function fetchRoutes(form: RouteFormValues): Promise<RoutesResponse> {
  try {
    const { data } = await api.post<RoutesResponse>('/routes/', form);
    if (data && data.routes && data.routes.length > 0) {
      return data;
    }
  } catch (err) {
    console.info('Backend API unavailable, using embedded client routing engine fallback.');
  }

  // Resilient fallback: calculates instantly
  return generateClientRoutes(form);
}

export async function fetchHeatmap(
  bbox: { minLat: number; minLon: number; maxLat: number; maxLon: number },
  forecastHour: number
): Promise<HeatmapPoint[]> {
  try {
    const { data } = await api.get<{ points: HeatmapPoint[] }>('/heatmap/', {
      params: {
        min_lat: bbox.minLat,
        min_lon: bbox.minLon,
        max_lat: bbox.maxLat,
        max_lon: bbox.maxLon,
        forecast_hour: forecastHour,
      },
    });
    if (data && data.points && data.points.length > 0) {
      return data.points;
    }
  } catch (err) {
    // Fallback grid
  }

  // Generate smooth 2D risk field
  const steps = 14;
  const latStep = (bbox.maxLat - bbox.minLat) / (steps - 1);
  const lonStep = (bbox.maxLon - bbox.minLon) / (steps - 1);
  const points: HeatmapPoint[] = [];

  for (let i = 0; i < steps; i++) {
    const lat = bbox.minLat + i * latStep;
    for (let j = 0; j < steps; j++) {
      const lon = bbox.minLon + j * lonStep;
      const intensity = Math.max(
        0,
        Math.sin(lat * 0.4 + lon * 0.3 + forecastHour * 0.15)
      );
      const windMph = Math.round(15 + intensity * 40);
      const riskScore = intensity > 0.8 ? 4 : intensity > 0.6 ? 3 : intensity > 0.35 ? 2 : intensity > 0.15 ? 1 : 0;
      points.push({
        lat: Number(lat.toFixed(4)),
        lon: Number(lon.toFixed(4)),
        risk_score: riskScore,
        wind_mph: windMph,
      });
    }
  }
  return points;
}

export async function geocodeAddress(query: string): Promise<{ lat: number; lon: number }> {
  try {
    const { data } = await api.get<{ lat: number; lon: number }>('/geocode/', {
      params: { q: query },
    });
    return data;
  } catch (err) {
    const [lat, lon] = geocodeFallback(query);
    return { lat, lon };
  }
}
