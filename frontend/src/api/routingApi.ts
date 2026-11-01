import axios from 'axios';
import type { RoutesResponse, HeatmapPoint, RouteFormValues } from '../types';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

export async function fetchRoutes(form: RouteFormValues): Promise<RoutesResponse> {
  const { data } = await api.post<RoutesResponse>('/routes/', form);
  return data;
}

export async function fetchHeatmap(
  bbox: { minLat: number; minLon: number; maxLat: number; maxLon: number },
  forecastHour: number
): Promise<HeatmapPoint[]> {
  const { data } = await api.get<{ points: HeatmapPoint[] }>('/heatmap/', {
    params: {
      min_lat: bbox.minLat,
      min_lon: bbox.minLon,
      max_lat: bbox.maxLat,
      max_lon: bbox.maxLon,
      forecast_hour: forecastHour,
    },
  });
  return data.points;
}

export async function geocodeAddress(query: string): Promise<{ lat: number; lon: number }> {
  const { data } = await api.get<{ lat: number; lon: number }>('/geocode/', {
    params: { q: query },
  });
  return data;
}

