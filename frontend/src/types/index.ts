// Shared TypeScript types for the Weather-Aware Truck Routing application

export type RiskLabel = 'Low' | 'Moderate' | 'High' | 'Severe' | 'No Travel';

export interface Checkpoint {
  index: number;
  lat: number;
  lon: number;
  distance_miles: number;
  arrival_dt: string;
  // Weather metrics
  wind_mph: number;
  rain_mm_per_hr: number;
  snow_mm_per_hr: number;
  rain_in_per_hr: number;
  snow_in_per_hr: number;
  temperature_c: number;
  description: string;
  icon: string;
  dt: number;
  // Weather risk evaluation
  wind_risk: number;
  rain_risk: number;
  snow_risk: number;
  risk_score: number;
  risk_label: RiskLabel;
  risk_color: string;
  load_warnings?: string[];
  driving_factors?: string[];
}

export interface RouteScore {
  no_travel_miles: number;
  severe_miles: number;
  high_miles: number;
  moderate_miles: number;
  low_miles: number;
  no_travel_count: number;
  severe_count: number;
  high_count: number;
  moderate_count: number;
  low_count: number;
  avg_risk_score: number;
  max_risk_score?: number;
  max_risk_label?: string;
}

export interface Route {
  index: number;
  rank: number;
  name?: string;
  recommended: boolean;
  recommendation_reason?: string;
  geometry: [number, number][]; // [lon, lat] coordinates
  distance_km: number;
  distance_miles: number;
  duration_seconds: number;
  checkpoints: Checkpoint[];
  score: RouteScore;
  origin: { lat: number; lon: number; label: string };
  destination: { lat: number; lon: number; label: string };
  departure_dt: string;
  load_weight_lb: number;
  interval_miles?: number;
}

export interface RoutesResponse {
  routes: Route[];
  recommended_index: number;
  summary?: {
    origin: string;
    destination: string;
    departure_datetime: string;
    load_weight_lb: number;
    interval_miles: number;
    route_count: number;
  };
}

export interface HeatmapPoint {
  lat: number;
  lon: number;
  risk_score: number;
  risk_label?: string;
  wind_mph: number;
  rain_in_per_hr?: number;
  snow_in_per_hr?: number;
  temperature_c?: number;
}

export interface RouteFormValues {
  origin: string;
  destination: string;
  departure_datetime: string;
  load_weight_lb: number;
  interval_miles: number;
}

export type AppStatus = 'idle' | 'loading' | 'success' | 'error';
