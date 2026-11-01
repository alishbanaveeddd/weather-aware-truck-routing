import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';
import type { HeatmapPoint } from '../types';

interface Props {
  points: HeatmapPoint[];
}

// Extend Leaflet types for leaflet.heat
declare module 'leaflet' {
  function heatLayer(
    latlngs: [number, number, number][],
    options?: {
      radius?: number;
      blur?: number;
      maxZoom?: number;
      max?: number;
      gradient?: Record<string, string>;
    }
  ): L.Layer;
}

const RISK_GRADIENT = {
  0.0: '#22c55e', // Low — green
  0.25: '#84cc16',
  0.5: '#eab308', // Moderate — yellow
  0.625: '#f97316', // High — orange
  0.75: '#ef4444', // Severe — red
  1.0: '#7c3aed', // No Travel — purple
};

export default function HeatmapLayer({ points }: Props) {
  const map = useMap();
  const layerRef = useRef<L.Layer | null>(null);

  useEffect(() => {
    if (!points.length) return;

    // Convert to Leaflet heat format: [lat, lon, intensity 0–1]
    const heatData: [number, number, number][] = points.map((p) => [
      p.lat,
      p.lon,
      p.risk_score / 4, // normalize 0–4 → 0–1
    ]);

    if (layerRef.current) {
      map.removeLayer(layerRef.current);
    }

    const layer = L.heatLayer(heatData, {
      radius: 60,
      blur: 40,
      maxZoom: 12,
      max: 1,
      gradient: RISK_GRADIENT,
    });

    layer.addTo(map);
    layerRef.current = layer;

    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [points, map]);

  return null;
}

